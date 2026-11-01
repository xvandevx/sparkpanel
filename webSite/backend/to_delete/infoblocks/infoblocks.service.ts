import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { InfoblockElements } from './infoblock-element.model';
import { InfoblockSections } from './infoblock-section.model';
import { Infoblocks } from './infoblock.model';
import { CreateInfoblockElementDto } from './dto/create-infoblock-element.dto';
import { CreateInfoblockSectionDto } from './dto/create-infoblock-section.dto';
import { CreateInfoblockDto } from './dto/create-infoblock.dto';
import { InfoblockElementDto } from './dto/infoblock-element.dto';
import { InfoblockSectionDto } from './dto/infoblock-section.dto';
import { InfoblockDto } from './dto/infoblock.dto';
import { RemovedInfoblockDto } from './dto/removed-infoblock.dto';
import { UpdateInfoblockElementDto } from './dto/update-infoblock-element.dto';
import { UpdateInfoblockSectionDto } from './dto/update-infoblock-section.dto';
import { UpdateInfoblockDto } from './dto/update-infoblock.dto';

/**
 * Тип записи в журнале изменений — общий журнал раздела читается по нему же.
 * Раздел, инфоблок и элемент пишутся под одним типом: журнал в админке один
 * на весь раздел, а что именно поменяли, видно по приставке идентификатора.
 */
export const INFOBLOCKS_ENTITY = 'infoblocks';

export const sectionHistoryId = (id: number): string => `section-${id}`;
export const blockHistoryId = (id: number): string => `block-${id}`;
export const elementHistoryId = (id: number): string => `element-${id}`;

/** Шаг сортировки: между соседями остаётся место, чтобы вставить запись вручную. */
const POSITION_STEP = 100;

@Injectable()
export class InfoblocksService {
  constructor(
    @InjectModel(InfoblockSections) private readonly sectionRepo: typeof InfoblockSections,
    @InjectModel(Infoblocks) private readonly blockRepo: typeof Infoblocks,
    @InjectModel(InfoblockElements) private readonly elementRepo: typeof InfoblockElements,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
  ) {}

  // ─── Структура: разделы вместе с инфоблоками ────────────────────────────────

  /**
   * Вся структура раздела одним запросом: разделы, их инфоблоки и число
   * элементов в каждом. Левая панель показывает это дерево целиком, поэтому
   * запрашивать инфоблоки раздела по отдельности незачем.
   */
  async findStructure(userId: number): Promise<InfoblockSectionDto[]> {
    const [sections, blocks] = await Promise.all([
      this.sectionRepo.findAll({ where: { userId }, order: ORDER }),
      this.blockRepo.findAll({ where: { userId }, order: ORDER }),
    ]);

    const counts = await this.countElements(
      userId,
      blocks.map((block) => block.id),
    );

    const blocksBySection = new Map<number, InfoblockDto[]>();
    for (const block of blocks) {
      const list = blocksBySection.get(block.sectionId) ?? [];
      list.push(InfoblockDto.from(block, counts.get(block.id) ?? 0));
      blocksBySection.set(block.sectionId, list);
    }

    return sections.map((section) =>
      InfoblockSectionDto.from(section, blocksBySection.get(section.id) ?? []),
    );
  }

  // ─── Разделы ────────────────────────────────────────────────────────────────

  async createSection(
    userId: number,
    dto: CreateInfoblockSectionDto,
    author: HistoryAuthor,
  ): Promise<InfoblockSectionDto> {
    return this.sequelize.transaction(async (transaction) => {
      const position = dto.position ?? (await this.nextSectionPosition(userId, transaction));
      const section = await this.guarded(
        () =>
          this.sectionRepo.create(
            {
              userId,
              code: dto.code,
              name: dto.name,
              description: dto.description ?? null,
              position,
            },
            { transaction },
          ),
        SECTION_CODE_TAKEN,
      );

      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: sectionHistoryId(section.id),
        entityCode: section.code,
        entityName: section.name,
        action: HistoryAction.Create,
        after: sectionSnapshot(section),
        author,
        transaction,
      });

      return InfoblockSectionDto.from(section);
    });
  }

  async updateSection(
    userId: number,
    id: number,
    dto: UpdateInfoblockSectionDto,
    author: HistoryAuthor,
  ): Promise<InfoblockSectionDto> {
    const section = await this.getOwnSection(userId, id);
    const before = sectionSnapshot(section);

    return this.sequelize.transaction(async (transaction) => {
      await this.guarded(
        () =>
          section.update(
            {
              ...(dto.code !== undefined ? { code: dto.code } : {}),
              ...(dto.name !== undefined ? { name: dto.name } : {}),
              ...(dto.description !== undefined ? { description: dto.description } : {}),
              ...(dto.position !== undefined ? { position: dto.position } : {}),
            },
            { transaction },
          ),
        SECTION_CODE_TAKEN,
      );

      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: sectionHistoryId(section.id),
        entityCode: section.code,
        entityName: section.name,
        action: HistoryAction.Update,
        before,
        after: sectionSnapshot(section),
        author,
        transaction,
      });

      // Отдаём раздел вместе с инфоблоками: схема обещает их всегда,
      // а пустой список читался бы как «раздел опустел»
      return InfoblockSectionDto.from(section, await this.blocksOf(userId, section.id, transaction));
    });
  }

  /** Удаление раздела уносит его инфоблоки, а те — свои элементы. */
  async removeSection(
    userId: number,
    id: number,
    author: HistoryAuthor,
  ): Promise<RemovedInfoblockDto> {
    const section = await this.getOwnSection(userId, id);
    const blocks = await this.blockRepo.findAll({
      where: { userId, sectionId: section.id },
      order: ORDER,
    });

    return this.sequelize.transaction(async (transaction) => {
      let removedElements = 0;
      for (const block of blocks) {
        removedElements += await this.purgeBlock(userId, block, author, transaction);
      }

      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: sectionHistoryId(section.id),
        entityCode: section.code,
        entityName: section.name,
        action: HistoryAction.Delete,
        before: sectionSnapshot(section),
        author,
        transaction,
      });
      await this.sectionRepo.destroy({ where: { userId, id: section.id }, transaction });

      return { removedBlocks: blocks.length, removedElements };
    });
  }

  // ─── Инфоблоки ──────────────────────────────────────────────────────────────

  async createBlock(
    userId: number,
    dto: CreateInfoblockDto,
    author: HistoryAuthor,
  ): Promise<InfoblockDto> {
    // Инфоблок всегда внутри раздела, и раздел должен быть своим
    const section = await this.getOwnSection(userId, dto.sectionId);

    return this.sequelize.transaction(async (transaction) => {
      const position =
        dto.position ?? (await this.nextBlockPosition(userId, section.id, transaction));
      const block = await this.guarded(
        () =>
          this.blockRepo.create(
            {
              userId,
              sectionId: section.id,
              code: dto.code,
              name: dto.name,
              description: dto.description ?? null,
              elementName: dto.elementName?.trim() || DEFAULT_ELEMENT_NAME,
              isActive: dto.isActive ?? true,
              position,
            },
            { transaction },
          ),
        BLOCK_CODE_TAKEN,
      );

      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: blockHistoryId(block.id),
        entityCode: block.code,
        entityName: block.name,
        action: HistoryAction.Create,
        after: blockSnapshot(block),
        author,
        transaction,
      });

      return InfoblockDto.from(block);
    });
  }

  async updateBlock(
    userId: number,
    id: number,
    dto: UpdateInfoblockDto,
    author: HistoryAuthor,
  ): Promise<InfoblockDto> {
    const block = await this.getOwnBlock(userId, id);
    const before = blockSnapshot(block);

    // Перенос в другой раздел — тот же запрос; раздел проверяем на своего
    if (dto.sectionId !== undefined && dto.sectionId !== block.sectionId) {
      await this.getOwnSection(userId, dto.sectionId);
    }

    return this.sequelize.transaction(async (transaction) => {
      await this.guarded(
        () =>
          block.update(
            {
              ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
              ...(dto.code !== undefined ? { code: dto.code } : {}),
              ...(dto.name !== undefined ? { name: dto.name } : {}),
              ...(dto.description !== undefined ? { description: dto.description } : {}),
              ...(dto.elementName !== undefined
                ? { elementName: dto.elementName.trim() || DEFAULT_ELEMENT_NAME }
                : {}),
              ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
              ...(dto.position !== undefined ? { position: dto.position } : {}),
            },
            { transaction },
          ),
        BLOCK_CODE_TAKEN,
      );

      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: blockHistoryId(block.id),
        entityCode: block.code,
        entityName: block.name,
        action: HistoryAction.Update,
        before,
        after: blockSnapshot(block),
        author,
        transaction,
      });

      const count = await this.elementRepo.count({
        where: { userId, infoblockId: block.id },
        transaction,
      });
      return InfoblockDto.from(block, count);
    });
  }

  /** Удаление инфоблока уносит его элементы: список без своего инфоблока не существует. */
  async removeBlock(
    userId: number,
    id: number,
    author: HistoryAuthor,
  ): Promise<RemovedInfoblockDto> {
    const block = await this.getOwnBlock(userId, id);

    return this.sequelize.transaction(async (transaction) => {
      const removedElements = await this.purgeBlock(userId, block, author, transaction);
      return { removedBlocks: 1, removedElements };
    });
  }

  // ─── Элементы ───────────────────────────────────────────────────────────────

  /** Элементы одного инфоблока по порядку. */
  async findElements(userId: number, blockId: number): Promise<InfoblockElementDto[]> {
    // Инфоблок проверяем на своего: иначе по чужому номеру отдали бы чужой список
    await this.getOwnBlock(userId, blockId);
    const elements = await this.elementRepo.findAll({
      where: { userId, infoblockId: blockId },
      order: ORDER,
    });
    return elements.map(InfoblockElementDto.from);
  }

  async createElement(
    userId: number,
    blockId: number,
    dto: CreateInfoblockElementDto,
    author: HistoryAuthor,
  ): Promise<InfoblockElementDto> {
    const block = await this.getOwnBlock(userId, blockId);

    return this.sequelize.transaction(async (transaction) => {
      const position =
        dto.position ?? (await this.nextElementPosition(userId, block.id, transaction));
      const element = await this.guarded(
        () =>
          this.elementRepo.create(
            {
              userId,
              infoblockId: block.id,
              code: dto.code,
              name: dto.name,
              preview: dto.preview ?? null,
              content: dto.content ?? null,
              image: dto.image ?? null,
              date: dto.date ?? null,
              isActive: dto.isActive ?? true,
              position,
              props: dto.props ?? {},
            },
            { transaction },
          ),
        ELEMENT_CODE_TAKEN,
      );

      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: elementHistoryId(element.id),
        entityCode: element.code,
        entityName: element.name,
        action: HistoryAction.Create,
        after: elementSnapshot(element),
        author,
        transaction,
      });

      return InfoblockElementDto.from(element);
    });
  }

  async updateElement(
    userId: number,
    blockId: number,
    id: number,
    dto: UpdateInfoblockElementDto,
    author: HistoryAuthor,
  ): Promise<InfoblockElementDto> {
    const element = await this.getOwnElement(userId, blockId, id);
    const before = elementSnapshot(element);

    return this.sequelize.transaction(async (transaction) => {
      await this.guarded(
        () =>
          element.update(
            {
              ...(dto.code !== undefined ? { code: dto.code } : {}),
              ...(dto.name !== undefined ? { name: dto.name } : {}),
              ...(dto.preview !== undefined ? { preview: dto.preview } : {}),
              ...(dto.content !== undefined ? { content: dto.content } : {}),
              ...(dto.image !== undefined ? { image: dto.image } : {}),
              ...(dto.date !== undefined ? { date: dto.date } : {}),
              ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
              ...(dto.position !== undefined ? { position: dto.position } : {}),
              ...(dto.props !== undefined ? { props: dto.props } : {}),
            },
            { transaction },
          ),
        ELEMENT_CODE_TAKEN,
      );

      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: elementHistoryId(element.id),
        entityCode: element.code,
        entityName: element.name,
        action: HistoryAction.Update,
        before,
        after: elementSnapshot(element),
        author,
        transaction,
      });

      return InfoblockElementDto.from(element);
    });
  }

  async removeElement(
    userId: number,
    blockId: number,
    id: number,
    author: HistoryAuthor,
  ): Promise<RemovedInfoblockDto> {
    const element = await this.getOwnElement(userId, blockId, id);

    await this.sequelize.transaction(async (transaction) => {
      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: elementHistoryId(element.id),
        entityCode: element.code,
        entityName: element.name,
        action: HistoryAction.Delete,
        before: elementSnapshot(element),
        author,
        transaction,
      });
      await this.elementRepo.destroy({ where: { userId, id: element.id }, transaction });
    });

    return { removedBlocks: 0, removedElements: 1 };
  }

  // ─── Журнал ─────────────────────────────────────────────────────────────────

  /** История одной записи: `entityId` — уже с приставкой (`section-1`, `element-3`). */
  findHistory(userId: number, entityId: string) {
    return this.historyService.findByEntityId(userId, INFOBLOCKS_ENTITY, entityId);
  }

  findJournal(userId: number, limit: number, offset: number) {
    return this.historyService.findByEntity(userId, INFOBLOCKS_ENTITY, limit, offset);
  }

  // ─── Внутреннее ─────────────────────────────────────────────────────────────

  /** Инфоблок вместе с элементами: в журнал попадает каждая удалённая запись. */
  private async purgeBlock(
    userId: number,
    block: Infoblocks,
    author: HistoryAuthor,
    transaction: Transaction,
  ): Promise<number> {
    const elements = await this.elementRepo.findAll({
      where: { userId, infoblockId: block.id },
      order: ORDER,
      transaction,
    });

    for (const element of elements) {
      await this.historyService.record({
        userId,
        entity: INFOBLOCKS_ENTITY,
        entityId: elementHistoryId(element.id),
        entityCode: element.code,
        entityName: element.name,
        action: HistoryAction.Delete,
        before: elementSnapshot(element),
        author,
        transaction,
      });
    }
    await this.elementRepo.destroy({ where: { userId, infoblockId: block.id }, transaction });

    await this.historyService.record({
      userId,
      entity: INFOBLOCKS_ENTITY,
      entityId: blockHistoryId(block.id),
      entityCode: block.code,
      entityName: block.name,
      action: HistoryAction.Delete,
      before: blockSnapshot(block),
      author,
      transaction,
    });
    await this.blockRepo.destroy({ where: { userId, id: block.id }, transaction });

    return elements.length;
  }

  /** Инфоблоки одного раздела вместе с числом записей в каждом. */
  private async blocksOf(
    userId: number,
    sectionId: number,
    transaction?: Transaction,
  ): Promise<InfoblockDto[]> {
    const blocks = await this.blockRepo.findAll({
      where: { userId, sectionId },
      order: ORDER,
      transaction,
    });
    const counts = await this.countElements(
      userId,
      blocks.map((block) => block.id),
      transaction,
    );
    return blocks.map((block) => InfoblockDto.from(block, counts.get(block.id) ?? 0));
  }

  /** Сколько элементов в каждом инфоблоке — одним запросом на весь список. */
  private async countElements(
    userId: number,
    blockIds: number[],
    transaction?: Transaction,
  ): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (blockIds.length === 0) return counts;

    const rows = (await this.elementRepo.findAll({
      where: { userId, infoblockId: blockIds },
      attributes: [
        'infoblockId',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'total'],
      ],
      group: ['infoblockId'],
      raw: true,
      transaction,
    })) as unknown as { infoblockId: number; total: string }[];

    for (const row of rows) counts.set(Number(row.infoblockId), Number(row.total));
    return counts;
  }

  // Фильтр по userId, а не только по id: записи всех пользователей в одной таблице.
  private async getOwnSection(userId: number, id: number): Promise<InfoblockSections> {
    const section = await this.sectionRepo.findOne({ where: { id, userId } });
    if (!section) throw new NotFoundException('Раздел инфоблоков не найден');
    return section;
  }

  private async getOwnBlock(userId: number, id: number): Promise<Infoblocks> {
    const block = await this.blockRepo.findOne({ where: { id, userId } });
    if (!block) throw new NotFoundException('Инфоблок не найден');
    return block;
  }

  /**
   * Элемент ищется вместе со своим инфоблоком: номер элемента в адресе
   * без этой проверки позволил бы править чужой список своим же запросом.
   */
  private async getOwnElement(
    userId: number,
    blockId: number,
    id: number,
  ): Promise<InfoblockElements> {
    const element = await this.elementRepo.findOne({
      where: { id, userId, infoblockId: blockId },
    });
    if (!element) throw new NotFoundException('Элемент инфоблока не найден');
    return element;
  }

  private async nextSectionPosition(userId: number, transaction: Transaction): Promise<number> {
    const max = await this.sectionRepo.max('position', { where: { userId }, transaction });
    return (Number(max) || 0) + POSITION_STEP;
  }

  private async nextBlockPosition(
    userId: number,
    sectionId: number,
    transaction: Transaction,
  ): Promise<number> {
    const max = await this.blockRepo.max('position', {
      where: { userId, sectionId },
      transaction,
    });
    return (Number(max) || 0) + POSITION_STEP;
  }

  private async nextElementPosition(
    userId: number,
    infoblockId: number,
    transaction: Transaction,
  ): Promise<number> {
    const max = await this.elementRepo.max('position', {
      where: { userId, infoblockId },
      transaction,
    });
    return (Number(max) || 0) + POSITION_STEP;
  }

  /** Нарушение уникального индекса — это занятый код, а не отказ сервера. */
  private async guarded<T>(action: () => Promise<T>, message: string): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw new ConflictException(message);
      throw error;
    }
  }
}

/** Порядок везде один: сначала заданная сортировка, при равенстве — по времени создания. */
const ORDER: [string, string][] = [
  ['position', 'ASC'],
  ['createdAt', 'ASC'],
];

/** Подпись записи списка по умолчанию — пока раздел не назвал её по-своему. */
const DEFAULT_ELEMENT_NAME = 'Элемент';

const SECTION_CODE_TAKEN = 'Раздел инфоблоков с таким кодом уже есть';
const BLOCK_CODE_TAKEN = 'Инфоблок с таким кодом уже есть';
const ELEMENT_CODE_TAKEN = 'В этом инфоблоке уже есть элемент с таким кодом';

/**
 * Плоские снимки для журнала: ключи совпадают с полями формы в админке,
 * поэтому в истории видно, что поменялся именно «Код инфоблока», а не «инфоблок».
 */
function sectionSnapshot(section: InfoblockSections): Record<string, unknown> {
  return {
    code: section.code,
    name: section.name,
    description: section.description ?? null,
    position: section.position,
  };
}

function blockSnapshot(block: Infoblocks): Record<string, unknown> {
  return {
    sectionId: block.sectionId,
    code: block.code,
    name: block.name,
    description: block.description ?? null,
    elementName: block.elementName ?? '',
    isActive: block.isActive,
    position: block.position,
  };
}

function elementSnapshot(element: InfoblockElements): Record<string, unknown> {
  return {
    code: element.code,
    name: element.name,
    preview: element.preview ?? null,
    content: element.content ?? null,
    image: element.image ?? null,
    date: element.date ?? null,
    isActive: element.isActive,
    position: element.position,
    props: element.props ?? {},
  };
}
