import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StorageService } from '../storage/storage.service';
import { FileDto } from './dto/file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { contentDisposition } from './file-disposition';
import { buildObjectKey } from './file-key';
import { FileSectionsService } from './file-sections.service';
import { Files } from './files.model';

/** Больше nginx всё равно не пропустит (client_max_body_size 20m). */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(Files) private readonly fileRepo: typeof Files,
    private readonly sectionsService: FileSectionsService,
    private readonly storage: StorageService,
  ) {}

  /** Файлы раздела; без раздела — вся медиатека. Свежие сверху: их и ищут. */
  async findAll(userId: number, sectionId?: number): Promise<FileDto[]> {
    if (sectionId !== undefined) await this.sectionsService.getOwn(userId, sectionId);

    const files = await this.fileRepo.findAll({
      where: { userId, ...(sectionId !== undefined ? { sectionId } : {}) },
      order: [['createdAt', 'DESC']],
    });

    return files.map((file) => this.toDto(file));
  }

  /**
   * Загрузка: сначала объект в хранилище, потом карточка в базе. Если база
   * не приняла строку, объект убираем — иначе в хранилище копился бы мусор,
   * на который никто не ссылается.
   */
  async upload(
    userId: number,
    dto: UploadFileDto,
    upload: Express.Multer.File | undefined,
  ): Promise<FileDto> {
    if (!upload) throw new BadRequestException('Файл не передан');
    await this.sectionsService.getOwn(userId, dto.sectionId);

    const name = decodeOriginalName(upload.originalname);
    const objectKey = buildObjectKey(userId, name);
    const mimeType = upload.mimetype || 'application/octet-stream';

    // Что можно показать в браузере, а что только скачать, решаем здесь:
    // файлы отдаются с origin панели, и исполняемым типам там не место.
    await this.storage.put(objectKey, upload.buffer, mimeType, contentDisposition(mimeType, name));

    try {
      const file = await this.fileRepo.create({
        userId,
        sectionId: dto.sectionId,
        name,
        objectKey,
        mimeType,
        size: upload.size,
        description: dto.description ?? null,
      });
      return this.toDto(file);
    } catch (error) {
      await this.forget(objectKey);
      throw error;
    }
  }

  /** Правится только карточка: описание и раздел. Содержимое файла перезаливают заново. */
  async update(userId: number, id: number, dto: UpdateFileDto): Promise<FileDto> {
    const file = await this.getOwn(userId, id);
    if (dto.sectionId !== undefined) await this.sectionsService.getOwn(userId, dto.sectionId);

    await file.update({
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
    });

    return this.toDto(file);
  }

  /**
   * Удаление: сначала объект, потом карточка. Хранилище не ответило — карточку всё
   * равно убираем: файл в админке пропал, а недостижимый объект разберёт уборка
   * хранилища. Обратный порядок оставил бы пользователя с файлом, который не удаляется.
   */
  async remove(userId: number, id: number): Promise<number> {
    const file = await this.getOwn(userId, id);

    await this.forget(file.objectKey);
    await file.destroy();

    return file.id;
  }

  private async getOwn(userId: number, id: number): Promise<Files> {
    const file = await this.fileRepo.findOne({ where: { id, userId } });
    if (!file) throw new NotFoundException('Файл не найден');
    return file;
  }

  private async forget(objectKey: string): Promise<void> {
    try {
      await this.storage.remove(objectKey);
    } catch (error) {
      this.logger.warn(
        `Не удалось удалить объект ${objectKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private toDto(file: Files): FileDto {
    return FileDto.from(file, this.storage.publicUrl(file.objectKey));
  }
}

/**
 * multer читает имя файла из multipart как latin1, поэтому кириллица приезжает
 * крокозябрами. Перекодируем обратно, но только если имя вообще не ASCII и после
 * перекодировки получился корректный UTF-8.
 */
export const decodeOriginalName = (name: string): string => {
  const original = String(name ?? '');
  if (!/[\u0080-\u00ff]/.test(original)) return original;

  const decoded = Buffer.from(original, 'latin1').toString('utf8');
  return decoded.includes('\ufffd') ? original : decoded;
};
