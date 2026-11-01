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

/**
 * Файловое хранилище панели — S3 (локально и на проде это MinIO из docker-compose).
 * Сервис знает только про объекты: положить, удалить, сказать публичный адрес.
 * Что за файл лежит по ключу — забота модуля `files/`.
 *
 * Отдаёт файлы не бэкенд, а nginx: `/uploads/<ключ>` проксируется прямо в бакет,
 * поэтому адрес в `publicUrl` относительный — тот же origin, что и у панели.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicPrefix: string;

  /** Обещание готовности бакета; при неудаче сбрасывается — следующая загрузка попробует снова. */
  private ready: Promise<void> | null = null;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') ?? 'copanel-media';
    this.publicPrefix = (config.get<string>('S3_PUBLIC_PREFIX') ?? '/uploads').replace(/\/+$/, '');

    this.client = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT') ?? 'http://localhost:3404',
      region: config.get<string>('S3_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey: config.get<string>('S3_SECRET_KEY') ?? 'minioadmin',
      },
      // MinIO адресует бакет путём (`/bucket/key`), а не поддоменом: виртуальных
      // хостов у него нет, и без этого флага клиент уходит на bucket.localhost.
      forcePathStyle: true,
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

  async put(
    key: string,
    body: Buffer,
    contentType: string,
    disposition?: string,
  ): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Хранилище отдаёт этот заголовок как есть — им и решается,
        // показать файл в браузере или отдать на скачивание.
        ...(disposition ? { ContentDisposition: disposition } : {}),
        // Имя объекта уникально, содержимое не переписывается — можно кэшировать надолго.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** Адрес файла для браузера: относительный, отдаёт nginx из того же origin. */
  publicUrl(key: string): string {
    return `${this.publicPrefix}/${key}`;
  }

  /**
   * Бакет заводится сам при первом обращении и открывается на анонимное чтение:
   * картинки с сайта смотрят без токена. Открывается ровно `s3:GetObject` —
   * права на список объектов не выдаются, перебрать содержимое бакета нельзя.
   */
  private ensureBucket(): Promise<void> {
    if (this.ready) return this.ready;

    this.ready = (async () => {
      if (!(await this.bucketExists())) {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Создан бакет ${this.bucket}`);
      }
      await this.client.send(
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
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      // Бакета нет — создадим; всё остальное (нет сети, неверные ключи) наверх.
      if (isNotFound(error)) return false;
      throw error;
    }
  }
}

const isNotFound = (error: unknown): boolean => {
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
  const name = (error as { name?: string })?.name;
  return status === 404 || name === 'NotFound' || name === 'NoSuchBucket';
};

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
