import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { SettingsService } from '../../settings/settings.service';
import {
  StorageKind,
  StorageService,
  StorageTarget,
  describe,
} from '../../storage/storage.service';
import { StoragesService } from '../storages/storages.service';
import { PropertyValuesService } from '../values/property-values.service';
import { FileDto } from './dto/file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { contentDisposition } from './file-disposition';
import { fileCode, objectKeyOf } from './file-key';
import { fileListKey } from './file-lists';
import { FileLinksService } from './file-links.service';
import { Files } from './files.model';
import { FileSectionsService } from './sections/file-sections.service';

/** Больше nginx всё равно не пропустит (client_max_body_size 25m — с запасом на обвязку). */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

const BUILTIN: StorageTarget = { kind: StorageKind.Builtin };

/** Так встроенное хранилище называется у файла: строки в `infoblock_storages` у него нет. */
const BUILTIN_NAME = 'Встроенное';

type StorageTargets = Awaited<ReturnType<StoragesService['targets']>>;

/**
 * Файлы — список редактора контента: показать (весь или раздела), загрузить,
 * поправить имя и описание, удалить. Содержимое файла не правят — его
 * загружают заново. Владельца у файла нет: файлы общие на сайт.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(Files) private readonly fileRepo: typeof Files,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly sections: FileSectionsService,
    private readonly links: FileLinksService,
    private readonly settings: SettingsService,
    private readonly storages: StoragesService,
    private readonly storage: StorageService,
    private readonly values: PropertyValuesService,
  ) {}

  /**
   * Файлы раздела или свойства, а без них — все: весь список читает выбор
   * файла в карточке записи. Свежие сверху, с привязками к записям.
   */
  async findAll(
    { sectionId, propertyId }: { sectionId?: number; propertyId?: number } = {},
  ): Promise<FileDto[]> {
    const [files, links, targets] = await Promise.all([
      this.fileRepo.findAll({
        where: {
          ...(sectionId !== undefined ? { sectionId } : {}),
          ...(propertyId !== undefined ? { propertyId } : {}),
        },
        order: [
          ['createdAt', 'DESC'],
          ['id', 'DESC'],
        ],
      }),
      this.links.linksOf(
      ),
      this.storages.targets(),
    ]);
    return files.map((file) => this.dtoOf(file, targets, links.get(file.id) ?? []));
  }

  /**
   * Файлы по номерам — с адресами, без привязок: внешнему API, которое
   * показывает файлы, выбранные в записях.
   */
  async findByIds(ids: number[]): Promise<FileDto[]> {
    if (ids.length === 0) return [];
    const [files, targets] = await Promise.all([
      this.fileRepo.findAll({ where: { id: ids } }),
      this.storages.targets(),
    ]);
    return files.map((file) => this.dtoOf(file, targets, []));
  }

  /**
   * Загрузка: сначала карточка в базе, потом объект — ключ объекта собирается
   * из номера файла, а номер даёт база. Хранилище не приняло файл — карточку
   * убираем: иначе в списке остался бы файл, которого нет.
   *
   * Через свойство файл запоминает свойство (`propertyId`) — раздела под него
   * нет. Подходит ли он под ограничения свойства (формат, вес), проверяется
   * при сохранении значения: выбрать файл можно и из уже загруженных, и проверка
   * нужна там в любом случае.
   */
  async upload(
    dto: UploadFileDto,
    upload: Express.Multer.File | undefined,
  ): Promise<FileDto> {
    if (!upload) throw new BadRequestException('Файл не передан');
    if ((dto.sectionId === undefined) === (dto.propertyId === undefined)) {
      throw new BadRequestException('Укажите раздел или свойство — что-то одно');
    }

    // Раздел или свойство должны быть: иначе файл лёг бы в никуда
    if (dto.propertyId !== undefined) await this.sections.assertProperty(dto.propertyId);
    else await this.sections.getOwn(dto.sectionId as number);

    const name = decodeOriginalName(upload.originalname);
    const mimeType = upload.mimetype || 'application/octet-stream';
    const { storageId, target } = await this.settings.uploadTarget();

    const file = await this.fileRepo.create({
      sectionId: dto.sectionId ?? null,
      propertyId: dto.propertyId ?? null,
      name,
      code: fileCode(name),
      mimeType,
      size: upload.size,
      storageId,
    });

    // Что можно показать в браузере, а что только скачать, решаем здесь:
    // встроенное хранилище отдаёт файлы с origin панели, и исполняемым типам там не место
    try {
      await this.storage.put(
        target,
        objectKeyOf(file.id, file.code),
        upload.buffer,
        mimeType,
        contentDisposition(mimeType, name),
      );
    } catch (error) {
      await file.destroy();
      throw new BadRequestException(`Хранилище не приняло файл: ${describe(error)}`);
    }

    return this.dtoOf(file, await this.storages.targets(), []);
  }

  /** Имя — то, что правят в карточке файла. Объект в хранилище не трогается. */
  async update(id: number, dto: UpdateFileDto): Promise<FileDto> {
    const file = await this.getOne(id);
    await file.update({
      ...(dto.name !== undefined ? { name: dto.name } : {}),
    });

    const [links, targets] = await Promise.all([
      this.links.linksOf(
      ),
      this.storages.targets(),
    ]);
    return this.dtoOf(file, targets, links.get(file.id) ?? []);
  }

  /**
   * Удаление: записи забывают файл, карточка уходит, потом объект. Хранилище
   * не ответило — карточку всё равно убираем: файл в админке пропал,
   * а недостижимый объект разберёт уборка хранилища. Обратный порядок оставил
   * бы пользователя с файлом, который не удаляется.
   */
  async remove(id: number): Promise<void> {
    const file = await this.getOne(id);

    await this.sequelize.transaction(async (transaction) => {
      await this.links.forget(file.id, transaction);
      await file.destroy({ transaction });
    });

    // Файл — запись списка своего раздела или свойства: её собственные значения
    // свойств (Alt-текст, автор…) уходят вместе с ней, иначе остались бы сиротами
    await this.values.remove(fileListKey(file), [String(file.id)]);
    await this.forgetObject(file);
  }

  private async getOne(id: number): Promise<Files> {
    const file = await this.fileRepo.findByPk(id);
    if (!file) throw new NotFoundException('Файл не найден');
    return file;
  }

  /**
   * Файл для админки. Адрес — из ключа объекта и хранилища, где он лежит,
   * рядом название этого хранилища. Хранилища нет — нет ни адреса, ни названия.
   */
  private dtoOf(file: Files, targets: StorageTargets, links: FileDto['links']): FileDto {
    const storage =
      file.storageId === null
        ? { name: BUILTIN_NAME, target: BUILTIN }
        : targets.get(file.storageId);
    const url = storage ? this.storage.url(storage.target, objectKeyOf(file.id, file.code)) : '';
    return FileDto.from(file, url, storage?.name ?? '', links);
  }

  private async forgetObject(file: Pick<Files, 'id' | 'code' | 'storageId'>): Promise<void> {
    const key = objectKeyOf(file.id, file.code);
    const target = await this.settings.targetOf(file.storageId);
    if (!target) {
      this.logger.warn(`Объект ${key} не удалён: хранилища ${file.storageId} больше нет`);
      return;
    }
    try {
      await this.storage.remove(target, key);
    } catch (error) {
      this.logger.warn(`Не удалось удалить объект ${key}: ${describe(error)}`);
    }
  }

}

/**
 * multer читает имя файла из multipart как latin1, поэтому кириллица приезжает
 * крокозябрами. Перекодируем обратно, но только если имя вообще не ASCII и после
 * перекодировки получился корректный UTF-8.
 */
export const decodeOriginalName = (name: string): string => {
  const original = String(name ?? '');
  if (!/[\u0080-ÿ]/.test(original)) return original;

  const decoded = Buffer.from(original, 'latin1').toString('utf8');
  return decoded.includes('�') ? original : decoded;
};
