import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { DEFAULT_SORT } from '../../record-sort';
import { HistoryAction } from '../../history/history.model';
import {
  HistoryAuthor,
  HistoryService,
} from '../../history/history.service';
import { listMaxDepth, SITE_OWNER } from '../../settings/infoblock-kinds';
import { assertRecordCode } from '../../settings/record-code';
import { InfoblockSettings } from '../../settings/settings.model';
import { depthError } from '../../settings/tree-depth';
import { PropertyValuesService } from '../../values/property-values.service';
import { parentError } from '../../values/records-tree';
import { contentItemsList } from '../content-lists';
import { Contents } from '../contents.model';
import { ContentItems } from './content-items.model';
import { ContentItemDto } from './dto/content-item.dto';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { UpdateContentItemDto } from './dto/update-content-item.dto';

/**
 * Элементы типа контента — список редактора `content-items.<номер типа>`,
 * плоский или деревом — как задано в его настройках. Всё, что сверх кода,
 * названия и активности, — свойства списка: их значения пишет и читает
 * `infoblocks/values`, здесь их только стирают вместе с элементом.
 *
 * Элемент адресуется вместе с типом: иначе по одному номеру элемента правились
 * бы чужие списки, а журнал записывался бы не туда.
 */
@Injectable()
export class ContentItemsService {
  constructor(
    @InjectModel(ContentItems)
    private readonly itemRepo: typeof ContentItems,
    // Типы и настройки списка только читаются: элемент кладут лишь в свой тип и не глубже предела
    @InjectModel(Contents) private readonly contentRepo: typeof Contents,
    @InjectModel(InfoblockSettings)
    private readonly settingsRepo: typeof InfoblockSettings,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
    private readonly values: PropertyValuesService,
  ) {}

  /** Элементы типа плоским списком (дерево собирает фронт), по алфавиту. */
  async findAll(contentId: number): Promise<ContentItemDto[]> {
    await this.assertType(contentId);
    const items = await this.itemRepo.findAll({
      where: { contentId },
      order: [
        ['sort', 'ASC'],
        ['name', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return items.map(ContentItemDto.from);
  }

  async create(
    userId: number,
    contentId: number,
    dto: CreateContentItemDto,
    author: HistoryAuthor,
  ): Promise<ContentItemDto> {
    await this.assertType(contentId);
    const parentId = dto.parentId ?? null;
    await this.assertParent(contentId, null, parentId);
    await this.assertCode(userId, contentId, null, dto.code ?? '');

    return this.sequelize.transaction(async (transaction) => {
      const item = await this.itemRepo.create(
        {
          userId,
          contentId,
          parentId,
          code: dto.code ?? '',
          name: dto.name,
          isActive: dto.isActive ?? true,
          sort: dto.sort ?? DEFAULT_SORT,
        },
        { transaction },
      );
      await this.record(
        userId,
        item,
        HistoryAction.Create,
        null,
        snapshot(item),
        author,
        transaction,
      );
      return ContentItemDto.from(item);
    });
  }

  async update(
    userId: number,
    contentId: number,
    id: number,
    dto: UpdateContentItemDto,
    author: HistoryAuthor,
  ): Promise<ContentItemDto> {
    const item = await this.getOwn(contentId, id);
    const before = snapshot(item);
    if (dto.parentId !== undefined && dto.parentId !== item.parentId) {
      await this.assertParent(contentId, item.id, dto.parentId);
    }
    await this.assertCode(userId, contentId, item.id, dto.code ?? item.code ?? '');

    return this.sequelize.transaction(async (transaction) => {
      await item.update(
        {
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        },
        { transaction },
      );
      await this.record(
        userId,
        item,
        HistoryAction.Update,
        before,
        snapshot(item),
        author,
        transaction,
      );
      return ContentItemDto.from(item);
    });
  }

  /** Элемент с вложенными не удаляется: сносить ветку целиком — не то, чего ждут от корзины. */
  async remove(
    userId: number,
    contentId: number,
    id: number,
    author: HistoryAuthor,
  ): Promise<void> {
    const item = await this.getOwn(contentId, id);

    if (
      (await this.itemRepo.count({
        where: { contentId, parentId: id },
      })) > 0
    ) {
      throw new ConflictException(
        'В элементе есть вложенные элементы — сначала удалите или перенесите их',
      );
    }

    await this.sequelize.transaction(async (transaction) => {
      await this.record(
        userId,
        item,
        HistoryAction.Delete,
        snapshot(item),
        null,
        author,
        transaction,
      );
      await item.destroy({ transaction });
    });

    // Значения свойств уходят вместе с элементом
    await this.values.remove(contentItemsList(contentId), [
      String(item.id),
    ]);
  }

  /** Тип пользователя или 404: чужой неотличим от несуществующего. */
  private async assertType(contentId: number): Promise<void> {
    if (
      (await this.contentRepo.count({ where: { id: contentId } })) === 0
    ) {
      throw new NotFoundException('Тип контента не найден');
    }
  }

  /** Фильтр и по типу, а не только по номеру: элементы всех типов в одной таблице. */
  private async getOwn(
    contentId: number,
    id: number,
  ): Promise<ContentItems> {
    const item = await this.itemRepo.findOne({
      where: { id, contentId },
    });
    if (!item) throw new NotFoundException('Элемент не найден');
    return item;
  }

  /**
   * Куда можно положить элемент: в элемент того же типа, не в собственную ветку
   * и не глубже «Уровней вложенности» списка этого типа.
   */
  private async assertParent(
    contentId: number,
    id: number | null,
    parentId: number | null,
  ): Promise<void> {
    if (parentId !== null) await this.getOwn(contentId, parentId);

    const listKey = contentItemsList(contentId);
    const all = await this.itemRepo.findAll({
      attributes: ['id', 'parentId'],
      where: { contentId },
    });
    const parents = new Map(
      all.map((item) => [item.id, item.parentId ?? null]),
    );
    const settings = await this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey },
    });

    const error =
      (id === null ? null : parentError(id, parentId, parents)) ??
      depthError(parents, id, parentId, listMaxDepth(settings, listKey));
    if (error) throw new BadRequestException(error);
  }

  /**
   * Код элемента — по настройке «Символьный код записей» списка этого типа.
   * Уникален он в пределах типа: у каждого типа свой список.
   */
  private async assertCode(
    userId: number,
    contentId: number,
    id: number | null,
    code: string,
  ): Promise<void> {
    const listKey = contentItemsList(contentId);
    const settings = await this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey },
    });
    await assertRecordCode(settings, code, async (value) => {
      const count = await this.itemRepo.count({
        where: {
          userId,
          contentId,
          code: value,
          ...(id === null ? {} : { id: { [Op.ne]: id } }),
        },
      });
      return count > 0;
    });
  }

  private record(
    userId: number,
    item: ContentItems,
    action: HistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    author: HistoryAuthor,
    transaction: Transaction,
  ) {
    return this.historyService.record({
      userId,
      // Журнал у каждого типа свой: тип записи — ключ его списка
      entity: contentItemsList(item.contentId),
      entityId: String(item.id),
      entityCode: item.code,
      entityName: item.name,
      action,
      before,
      after,
      author,
      transaction,
    });
  }
}

/** Плоский снимок для журнала: ключи совпадают с полями карточки. */
const snapshot = (item: ContentItems): Record<string, unknown> => ({
  code: item.code ?? '',
  name: item.name,
  isActive: item.isActive,
  sort: item.sort,
  parentId: item.parentId ?? null,
});
