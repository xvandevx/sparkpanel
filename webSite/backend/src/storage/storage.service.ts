import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/** Где лежит файл: во встроенном MinIO панели или во внешнем S3 из настроек сайта. */
export enum StorageKind {
  Builtin = 'builtin',
  External = 'external',
}

/** Внешнее S3-хранилище — как его задали в настройках сайта. */
export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  /** Адрес, по которому файлы видны снаружи (CDN, домен бакета); пусто — endpoint/бакет */
  publicUrl: string;
}

/** Куда класть объект: встроенное хранилище своё, внешнему нужны его ключи. */
export type StorageTarget =
  | { kind: StorageKind.Builtin }
  | { kind: StorageKind.External; config: S3Config };

/**
 * Файловое хранилище панели — S3. Встроенное — MinIO из docker-compose: его
 * адрес и ключи в env, бакет бэкенд заводит сам, а отдаёт файлы nginx по
 * `/uploads/<ключ>` с того же origin. Внешнее задают в настройках сайта:
 * бакет там чужой, его не создаём и прав на нём не меняем — только кладём
 * и убираем объекты.
 *
 * Сервис знает только про объекты: положить, удалить, сказать адрес.
 * Что за файл лежит по ключу — забота модуля `files/`.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly builtin: S3Client;
  private readonly bucket: string;
  private readonly publicPrefix: string;

  /** Обещание готовности бакета; при неудаче сбрасывается — следующая загрузка попробует снова. */
  private ready: Promise<void> | null = null;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') ?? 'copanel-media';
    this.publicPrefix = (config.get<string>('S3_PUBLIC_PREFIX') ?? '/uploads').replace(/\/+$/, '');

    this.builtin = s3Client({
      endpoint: config.get<string>('S3_ENDPOINT') ?? 'http://localhost:3404',
      region: config.get<string>('S3_REGION') ?? 'us-east-1',
      accessKey: config.get<string>('S3_ACCESS_KEY') ?? 'minioadmin',
      secretKey: config.get<string>('S3_SECRET_KEY') ?? 'minioadmin',
    });
  }

  /**
   * Бакет готовим на старте, но падение здесь не роняет приложение: хранилище
   * может подняться позже панели, а без него работают все остальные разделы.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucket();
    } catch (error) {
      this.logger.warn(
        `Хранилище недоступно (${describe(error)}). Попробую снова при первой загрузке файла.`,
      );
    }
  }

  /** Кладёт объект; адрес, по которому его откроет браузер, — `url()`. */
  async put(
    target: StorageTarget,
    key: string,
    body: Buffer,
    contentType: string,
    disposition: string,
  ): Promise<void> {
    const command = (bucket: string) =>
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Хранилище отдаёт этот заголовок как есть — им и решается,
        // показать файл в браузере или отдать на скачивание
        ContentDisposition: disposition,
        // Имя объекта уникально, содержимое не переписывается — можно кэшировать надолго
        CacheControl: 'public, max-age=31536000, immutable',
      });

    if (target.kind === StorageKind.Builtin) {
      await this.ensureBucket();
      await this.builtin.send(command(this.bucket));
      return;
    }

    const { config } = target;
    await s3Client(config).send(command(config.bucket));
  }

  /**
   * Адрес объекта для браузера. Не хранится, а собирается: сменили публичный
   * адрес хранилища (подключили CDN) — сменились и адреса всех его файлов.
   * Встроенное хранилище отдаёт nginx с того же origin — адрес относительный.
   */
  url(target: StorageTarget, key: string): string {
    return target.kind === StorageKind.Builtin
      ? `${this.publicPrefix}/${key}`
      : externalUrl(target.config, key);
  }

  async remove(target: StorageTarget, key: string): Promise<void> {
    if (target.kind === StorageKind.Builtin) {
      await this.builtin.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return;
    }
    const { config } = target;
    await s3Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  }

  /**
   * Внешнее хранилище отвечает с этими ключами. Проверяется при сохранении
   * настроек: иначе о неверном ключе узнали бы только на первой загрузке,
   * уже из карточки записи.
   */
  async check(config: S3Config): Promise<void> {
    await s3Client(config).send(new HeadBucketCommand({ Bucket: config.bucket }));
  }

  /**
   * Встроенный бакет заводится сам при первом обращении и открывается на
   * анонимное чтение: картинки с сайта смотрят без токена. Открывается ровно
   * `s3:GetObject` — права на список объектов не выдаются, перебрать содержимое
   * бакета нельзя.
   */
  private ensureBucket(): Promise<void> {
    if (this.ready) return this.ready;

    this.ready = (async () => {
      if (!(await this.bucketExists())) {
        await this.builtin.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Создан бакет ${this.bucket}`);
      }
      await this.builtin.send(
        new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: publicReadPolicy(this.bucket) }),
      );
    })().catch((error) => {
      this.ready = null;
      throw error;
    });

    return this.ready;
  }

  private async bucketExists(): Promise<boolean> {
    try {
      await this.builtin.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      // Бакета нет — создадим; всё остальное (нет сети, неверные ключи) наверх
      if (isNotFound(error)) return false;
      throw error;
    }
  }
}

/**
 * Клиент S3. Бакет адресуется путём (`/bucket/key`), а не поддоменом: у MinIO
 * и многих совместимых хранилищ виртуальных хостов нет, а путь понимают все.
 */
const s3Client = (config: Pick<S3Config, 'endpoint' | 'region' | 'accessKey' | 'secretKey'>) =>
  new S3Client({
    endpoint: config.endpoint,
    region: config.region || 'us-east-1',
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    forcePathStyle: true,
  });

/** Адрес объекта во внешнем хранилище: свой публичный адрес или endpoint/бакет. */
const externalUrl = (config: S3Config, key: string): string => {
  const base = config.publicUrl.trim()
    ? config.publicUrl.trim().replace(/\/+$/, '')
    : `${config.endpoint.replace(/\/+$/, '')}/${config.bucket}`;
  return `${base}/${key}`;
};

const isNotFound = (error: unknown): boolean => {
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
  const name = (error as { name?: string })?.name;
  return status === 404 || name === 'NotFound' || name === 'NoSuchBucket';
};

export const describe = (error: unknown): string =>
  error instanceof Error ? error.message || error.name : String(error);

const publicReadPolicy = (bucket: string): string =>
  JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
