import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';

/** Где лежит файл: во встроенной папке панели или во внешнем S3 из настроек сайта. */
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

/** Адрес файлов встроенного хранилища — относительный, с того же origin, что панель. */
export const UPLOADS_PATH = '/uploads';

/**
 * Файловое хранилище панели. Встроенное — папка на диске (`UPLOADS_DIR`,
 * по умолчанию `uploads/` рядом с бэкендом, в образе — том `/data/uploads`):
 * файл лежит по своему ключу (`00/00/78/otchet.pdf`), а отдаёт его сама панель
 * по `/uploads/<ключ>` (`serve-uploads.ts`). Внешнее — S3 из настроек сайта:
 * бакет там чужой, его не создаём и прав на нём не меняем — только кладём
 * и убираем объекты.
 *
 * Сервис знает только про объекты: положить, удалить, сказать адрес.
 * Что за файл лежит по ключу — забота модуля `files/`.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  /** Папка встроенного хранилища, абсолютный путь */
  readonly uploadsDir: string;

  constructor(config: ConfigService) {
    this.uploadsDir = resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads');
  }

  /**
   * Папку заводим на старте, но падение здесь не роняет приложение: без неё
   * работают все разделы, кроме загрузки файлов, — та скажет о причине сама.
   */
  async onModuleInit(): Promise<void> {
    try {
      await mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      this.logger.warn(`Папка файлов ${this.uploadsDir} недоступна: ${describe(error)}`);
    }
  }

  /**
   * Кладёт объект; адрес, по которому его откроет браузер, — `url()`.
   * Тип и «показать или скачать» во внешнем хранилище пишутся в объект —
   * S3 отдаёт их как есть; встроенное решает это при отдаче, по расширению.
   */
  async put(
    target: StorageTarget,
    key: string,
    body: Buffer,
    contentType: string,
    disposition: string,
  ): Promise<void> {
    if (target.kind === StorageKind.Builtin) {
      const path = this.pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      return;
    }

    const { config } = target;
    await s3Client(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Хранилище отдаёт этот заголовок как есть — им и решается,
        // показать файл в браузере или отдать на скачивание
        ContentDisposition: disposition,
        // Имя объекта уникально, содержимое не переписывается — можно кэшировать надолго
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  /**
   * Адрес объекта для браузера. Не хранится, а собирается: сменили публичный
   * адрес хранилища (подключили CDN) — сменились и адреса всех его файлов.
   * Встроенное хранилище отдаётся с того же origin — адрес относительный.
   */
  url(target: StorageTarget, key: string): string {
    return target.kind === StorageKind.Builtin
      ? `${UPLOADS_PATH}/${key}`
      : externalUrl(target.config, key);
  }

  /** Убирает объект; во встроенном хранилище файла уже нет — не ошибка. */
  async remove(target: StorageTarget, key: string): Promise<void> {
    if (target.kind === StorageKind.Builtin) {
      await unlink(this.pathOf(key)).catch((error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      });
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
   * Файл ключа в папке хранилища. Ключи собирает панель (`files/file-key.ts`),
   * но выйти за пределы папки не даём и им: путь сверяется после разрешения.
   */
  private pathOf(key: string): string {
    const path = resolve(this.uploadsDir, key);
    if (!path.startsWith(this.uploadsDir + sep)) {
      throw new Error(`Ключ ${key} ведёт за пределы папки файлов`);
    }
    return path;
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

export const describe = (error: unknown): string =>
  error instanceof Error ? error.message || error.name : String(error);
