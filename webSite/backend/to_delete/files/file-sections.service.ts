import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn, UniqueConstraintError } from 'sequelize';
import { CreateFileSectionDto } from './dto/create-file-section.dto';
import { FileSectionDto } from './dto/file-section.dto';
import { UpdateFileSectionDto } from './dto/update-file-section.dto';
import { FileSections } from './file-section.model';
import { Files } from './files.model';

@Injectable()
export class FileSectionsService {
  constructor(
    @InjectModel(FileSections) private readonly sectionRepo: typeof FileSections,
    @InjectModel(Files) private readonly fileRepo: typeof Files,
  ) {}

  /** Разделы пользователя со счётчиком файлов; порядок — по коду, как их ищут глазами. */
  async findAll(userId: number): Promise<FileSectionDto[]> {
    const sections = await this.sectionRepo.findAll({
      where: { userId },
      order: [['code', 'ASC']],
    });

    const counts = await this.countFiles(userId);
    return sections.map((section) => FileSectionDto.from(section, counts.get(section.id) ?? 0));
  }

  async create(userId: number, dto: CreateFileSectionDto): Promise<FileSectionDto> {
    const section = await this.createRow(userId, dto);
    return FileSectionDto.from(section, 0);
  }

  async update(userId: number, id: number, dto: UpdateFileSectionDto): Promise<FileSectionDto> {
    const section = await this.getOwn(userId, id);

    try {
      await section.update({
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      });
    } catch (error) {
      throw asCodeConflict(error);
    }

    const counts = await this.countFiles(userId);
    return FileSectionDto.from(section, counts.get(section.id) ?? 0);
  }

  /**
   * Удаление раздела. Непустой раздел удалить нельзя: файлы остались бы без раздела,
   * а молча сносить содержимое вместе с ним — не то, чего ждут от клика по корзине.
   */
  async remove(userId: number, id: number): Promise<number> {
    const section = await this.getOwn(userId, id);

    const filesCount = await this.fileRepo.count({ where: { userId, sectionId: id } });
    if (filesCount > 0) {
      throw new ConflictException('В разделе есть файлы — сначала удалите или перенесите их');
    }

    await section.destroy();
    return section.id;
  }

  /** Раздел пользователя или 404. Чужой раздел неотличим от несуществующего — так и надо. */
  async getOwn(userId: number, id: number): Promise<FileSections> {
    const section = await this.sectionRepo.findOne({ where: { id, userId } });
    if (!section) throw new NotFoundException('Раздел не найден');
    return section;
  }

  private async createRow(userId: number, dto: CreateFileSectionDto): Promise<FileSections> {
    try {
      return await this.sectionRepo.create({ userId, code: dto.code, name: dto.name });
    } catch (error) {
      throw asCodeConflict(error);
    }
  }

  /** Сколько файлов в каждом разделе: один запрос с группировкой, а не по разделу на строку. */
  private async countFiles(userId: number): Promise<Map<number, number>> {
    const rows = (await this.fileRepo.findAll({
      attributes: ['sectionId', [fn('COUNT', col('id')), 'count']],
      where: { userId },
      group: ['sectionId'],
      raw: true,
    })) as unknown as { sectionId: number; count: string }[];

    return new Map(rows.map((row) => [Number(row.sectionId), Number(row.count)]));
  }
}

/** Уникальный индекс `file_sections_user_code` — это занятый код, а не сбой базы. */
const asCodeConflict = (error: unknown): unknown =>
  error instanceof UniqueConstraintError
    ? new ConflictException('Раздел с таким кодом уже есть')
    : error;
