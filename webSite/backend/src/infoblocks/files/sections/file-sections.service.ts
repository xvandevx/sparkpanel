import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';
import { Contents } from '../../contents/contents.model';
import { DEFAULT_SORT } from '../../record-sort';
import { Files } from '../files.model';
import { InfoblockProperty } from '../../settings/properties/property.model';
import { listMaxDepth, SITE_OWNER } from '../../settings/infoblock-kinds';
import { InfoblockSettings } from '../../settings/settings.model';
import { depthError } from '../../settings/tree-depth';
import { CreateFileSectionDto } from './dto/create-file-section.dto';
import { FileSectionDto } from './dto/file-section.dto';
import { UpdateFileSectionDto } from './dto/update-file-section.dto';
import { FileSections } from './file-sections.model';
import { listTitle } from './section-groups';

/** Ключ списка разделов: по нему читаются его настройки, в том числе предел вложенности. */
const SECTIONS_LIST = 'file-sections';

/** Сколько файлов где лежит: по разделу и по свойству, через которое их загрузили. */
interface FileCounts {
  bySection: Map<number, number>;
  byProperty: Map<number, number>;
}

/**
 * Разделы файлов: дерево, по которому разложены файлы в разделе «Файлы».
 * Файлы в этом модуле только считаются — загружает и удаляет их `files/`.
 *
 * В базе только разделы, которые завёл пользователь. Файлы, загруженные через
 * свойство «Файл»/«Изображение», раздела не имеют — они помнят свойство
 * (`Files.propertyId`), а `findAll` показывает по разделу на каждое такое
 * свойство, в группе его списка. Ни заводить, ни удалять их не нужно.
 */
@Injectable()
export class FileSectionsService {
  constructor(
    @InjectModel(FileSections) private readonly sectionRepo: typeof FileSections,
    @InjectModel(Files) private readonly fileRepo: typeof Files,
    // Свойства, настройки списков и типы контента только читаются: чьё свойство,
    // как называется и где лежит его список
    @InjectModel(InfoblockProperty) private readonly propertyRepo: typeof InfoblockProperty,
    @InjectModel(InfoblockSettings) private readonly settingsRepo: typeof InfoblockSettings,
    @InjectModel(Contents) private readonly contentRepo: typeof Contents,
  ) {}

  /**
   * Разделы пользователя плоским списком (дерево собирает фронт), по алфавиту.
   * Впереди — разделы свойств, по которым загружены файлы, и группы их списков:
   * только для показа (`isReadOnly`), в базе их нет.
   */
  async findAll(): Promise<FileSectionDto[]> {
    const [sections, counts] = await Promise.all([
      this.sectionRepo.findAll({
        order: [
          ['sort', 'ASC'],
          ['name', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      this.countFiles(),
    ]);
    return [
      ...(await this.propertySections(counts.byProperty)),
      ...sections.map((section) => FileSectionDto.from(section, counts.bySection.get(section.id) ?? 0)),
    ];
  }

  async create(userId: number, dto: CreateFileSectionDto): Promise<FileSectionDto> {
    const parentId = dto.parentId ?? null;
    if (parentId !== null) await this.getOwn(parentId);
    await this.assertDepth(null, parentId);

    const section = await this.sectionRepo.create({
      userId,
      parentId,
      name: dto.name,
      sort: dto.sort ?? DEFAULT_SORT,
    });
    return FileSectionDto.from(section, 0);
  }

  async update(id: number, dto: UpdateFileSectionDto): Promise<FileSectionDto> {
    const section = await this.getOwn(id);
    if (dto.parentId !== undefined && dto.parentId !== section.parentId) {
      await this.assertCanMove(section, dto.parentId);
      await this.assertDepth(section.id, dto.parentId);
    }

    await section.update({
      ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
    });

    const counts = await this.countFiles();
    return FileSectionDto.from(section, counts.bySection.get(section.id) ?? 0);
  }

  /**
   * Удаляется только пустой раздел: молча сносить файлы и вложенные разделы
   * вместе с ним — не то, чего ждут от клика по корзине.
   */
  async remove(id: number): Promise<void> {
    const section = await this.getOwn(id);

    if ((await this.sectionRepo.count({ where: { parentId: id } })) > 0) {
      throw new ConflictException('В разделе есть вложенные разделы — сначала удалите или перенесите их');
    }
    if ((await this.fileRepo.count({ where: { sectionId: id } })) > 0) {
      throw new ConflictException('В разделе есть файлы — сначала удалите их');
    }

    await section.destroy();
  }

  /** Раздел пользователя или 404: чужой неотличим от несуществующего. */
  async getOwn(id: number): Promise<FileSections> {
    const section = await this.sectionRepo.findOne({ where: { id } });
    if (!section) throw new NotFoundException('Раздел не найден');
    return section;
  }

  /**
   * Свойство, через которое грузят файл, должно быть. Иначе 404.
   */
  async assertProperty(propertyId: number): Promise<void> {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Свойство не найдено');
    }
  }

  /**
   * Разделы свойств — по одному на свойство, через которое загружены файлы,
   * в группе своего списка; группы — по одной на список. Свойство удалили,
   * а файлы остались — раздел «Удалённое свойство» без группы: оттуда их удаляют.
   */
  private async propertySections(byProperty: Map<number, number>): Promise<FileSectionDto[]> {
    if (byProperty.size === 0) return [];

    const properties = await this.propertyRepo.findAll({ where: { id: [...byProperty.keys()] } });
    const lists = await this.settingsRepo.findAll({
      where: { id: properties.map((property) => property.settingsId) },
    });
    // Путь до списка элементов идёт по дереву типов контента
    const types = await this.contentRepo.findAll();

    const groups = new Map<string, FileSectionDto>();
    const rows: FileSectionDto[] = [];
    for (const [propertyId, filesCount] of byProperty) {
      const property = properties.find((item) => item.id === propertyId);
      const list = lists.find((item) => item.id === property?.settingsId);
      if (!property || !list) {
        rows.push(FileSectionDto.property(propertyId, `Удалённое свойство #${propertyId}`, null, filesCount));
        continue;
      }
      if (!groups.has(list.listKey)) {
        groups.set(
          list.listKey,
          FileSectionDto.group({ key: list.listKey, name: listTitle(list.listKey, list.name, types) }),
        );
      }
      rows.push(FileSectionDto.property(propertyId, property.name, list.listKey, filesCount));
    }

    const byName = (a: FileSectionDto, b: FileSectionDto) => a.name.localeCompare(b.name, 'ru');
    return [...[...groups.values()].sort(byName), ...rows.sort(byName)];
  }

  /**
   * Предел вложенности разделов — настройка «Уровней вложенности» списка
   * `file-sections` (по умолчанию 2). Запись встаёт под родителя вместе со всей
   * своей веткой; новая — одна.
   */
  private async assertDepth(id: number | null, parentId: number | null): Promise<void> {
    const settings = await this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey: SECTIONS_LIST },
    });
    const maxDepth = listMaxDepth(settings, SECTIONS_LIST);
    if (maxDepth === null) return;

    const all = await this.sectionRepo.findAll();
    const error = depthError(new Map(all.map((item) => [item.id, item.parentId])), id, parentId, maxDepth);
    if (error) throw new BadRequestException(error);
  }

  /** Перенос допустим куда угодно, кроме себя самого и собственной ветки. */
  private async assertCanMove(
    section: FileSections,
    parentId: number | null,
  ): Promise<void> {
    if (parentId === null) return;
    if (parentId === section.id) {
      throw new BadRequestException('Раздел не может быть родителем самому себе');
    }
    await this.getOwn(parentId);

    const all = await this.sectionRepo.findAll();
    const parents = new Map(all.map((item) => [item.id, item.parentId]));
    // Поднимаемся от нового родителя к корню: встретили себя — это своя ветка
    let current: number | null = parentId;
    const seen = new Set<number>();
    while (current !== null && !seen.has(current)) {
      if (current === section.id) {
        throw new BadRequestException('Раздел нельзя перенести внутрь его собственной ветки');
      }
      seen.add(current);
      current = parents.get(current) ?? null;
    }
  }

  /** Сколько файлов в каждом разделе и у каждого свойства: один запрос с группировкой. */
  private async countFiles(): Promise<FileCounts> {
    const rows = (await this.fileRepo.findAll({
      attributes: ['sectionId', 'propertyId', [fn('COUNT', col('id')), 'count']],
      group: ['sectionId', 'propertyId'],
      raw: true,
    })) as unknown as { sectionId: number | null; propertyId: number | null; count: string }[];

    const counts: FileCounts = { bySection: new Map(), byProperty: new Map() };
    for (const row of rows) {
      if (row.sectionId !== null) counts.bySection.set(Number(row.sectionId), Number(row.count));
      else if (row.propertyId !== null) counts.byProperty.set(Number(row.propertyId), Number(row.count));
    }
    return counts;
  }
}
