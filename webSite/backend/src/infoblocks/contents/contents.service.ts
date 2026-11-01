import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { col, fn, Op, Transaction } from 'sequelize';
import { DEFAULT_SORT } from '../record-sort';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { listMaxDepth, SITE_OWNER } from '../settings/infoblock-kinds';
import { assertRecordCode } from '../settings/record-code';
import { InfoblockSettings } from '../settings/settings.model';
import { InfoblockSettingsService } from '../settings/settings.service';
import { depthError } from '../settings/tree-depth';
import { PropertyValuesService } from '../values/property-values.service';
import { parentError } from '../values/records-tree';
import { contentItemsList, CONTENTS_LIST } from './content-lists';
import { Contents } from './contents.model';
import { ContentDto } from './dto/content.dto';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentItems } from './items/content-items.model';

/**
 * Типы контента — список редактора контента, плоский или деревом — как задано
 * в его настройках. Элементы типа здесь только считаются: заводит и правит
 * их вложенный модуль `items/`.
 *
 * Название и код типа — имя и код списка его элементов: тип их задаёт,
 * окно настроек того списка только показывает. Поэтому каждая запись типа
 * переписывает их в настройках списка, в той же транзакции: код списка
 * занят — не сохраняется и тип.
 */
@Injectable()
export class ContentsService {
  constructor(
    @InjectModel(Contents) private readonly contentRepo: typeof Contents,
    @InjectModel(ContentItems)
    private readonly itemRepo: typeof ContentItems,
    // Настройки списка типов только читаются: предел вложенности
    @InjectModel(InfoblockSettings)
    private readonly settingsRepo: typeof InfoblockSettings,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
    private readonly listSettings: InfoblockSettingsService,
    private readonly values: PropertyValuesService,
  ) {}

  /** Типы пользователя плоским списком (дерево собирает фронт), по алфавиту. */
  async findAll(): Promise<ContentDto[]> {
    const [types, counts] = await Promise.all([
      this.contentRepo.findAll({
        order: [
          ['sort', 'ASC'],
          ['name', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      this.countElements(
    ),
    ]);
    const parents = new Set(types.map((type) => type.parentId));
    return types.map((type) =>
      ContentDto.from(type, counts.get(type.id) ?? 0, parents.has(type.id)),
    );
  }

  async create(
    userId: number,
    dto: CreateContentDto,
    author: HistoryAuthor,
  ): Promise<ContentDto> {
    const parentId = dto.parentId ?? null;
    await this.assertParent(null, parentId);
    await this.assertCode(null, dto.code);

    return this.sequelize.transaction(async (transaction) => {
      const type = await this.contentRepo.create(
        {
          userId,
          parentId,
          code: dto.code,
          name: dto.name,
          isActive: dto.isActive ?? true,
          sort: dto.sort ?? DEFAULT_SORT,
        },
        { transaction },
      );
      await this.assignList(type, transaction);
      await this.record(
        userId,
        type,
        HistoryAction.Create,
        null,
        snapshot(type),
        author,
        transaction,
      );
      return ContentDto.from(type, 0, false);
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateContentDto,
    author: HistoryAuthor,
  ): Promise<ContentDto> {
    const type = await this.getOwn(id);
    const before = snapshot(type);
    if (dto.parentId !== undefined && dto.parentId !== type.parentId) {
      await this.assertParent(type.id, dto.parentId);
    }
    await this.assertCode(type.id, dto.code ?? type.code ?? '');

    await this.sequelize.transaction(async (transaction) => {
      await type.update(
        {
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        },
        { transaction },
      );
      await this.assignList(type, transaction);
      await this.record(
        userId,
        type,
        HistoryAction.Update,
        before,
        snapshot(type),
        author,
        transaction,
      );
    });

    const [counts, children] = await Promise.all([
      this.countElements(
      ),
      this.contentRepo.count({ where: { parentId: type.id } }),
    ]);
    return ContentDto.from(type, counts.get(type.id) ?? 0, children > 0);
  }

  /**
   * Удаляется только пустой тип: без элементов и без вложенных типов. Сносить
   * их вместе с ним — не то, чего ждут от клика по корзине. Такой тип приходит
   * с `isBlocked`.
   */
  async remove(
    userId: number,
    id: number,
    author: HistoryAuthor,
  ): Promise<void> {
    const type = await this.getOwn(id);

    if ((await this.itemRepo.count({ where: { contentId: id } })) > 0) {
      throw new ConflictException('В типе есть элементы — сначала удалите их');
    }
    if (
      (await this.contentRepo.count({ where: { parentId: id } })) > 0
    ) {
      throw new ConflictException(
        'В типе есть вложенные типы — сначала удалите или перенесите их',
      );
    }

    await this.sequelize.transaction(async (transaction) => {
      await this.record(
        userId,
        type,
        HistoryAction.Delete,
        snapshot(type),
        null,
        author,
        transaction,
      );
      await type.destroy({ transaction });
      // Код типа был кодом списка его элементов — освобождаем, иначе новый тип
      // с тем же кодом не завёлся бы
      await this.listSettings.releaseIdentity(contentItemsList(type.id),
        transaction,
      );
    });

    // Тип — запись своего списка: его собственные значения свойств уходят вместе с ним
    await this.values.remove(CONTENTS_LIST, [String(type.id)]);
  }

  /** Тип пользователя или 404: чужой неотличим от несуществующего. */
  private async getOwn(id: number): Promise<Contents> {
    const type = await this.contentRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Тип контента не найден');
    return type;
  }

  /** Название и код типа — в настройки списка его элементов. */
  private assignList(type: Contents, transaction: Transaction) {
    return this.listSettings.assignIdentity(contentItemsList(type.id),
      { name: type.name, code: type.code },
      transaction,
    );
  }

  /**
   * Куда можно положить тип: в свой тип, не в собственную ветку и не глубже
   * «Уровней вложенности» списка типов.
   */
  private async assertParent(
    id: number | null,
    parentId: number | null,
  ): Promise<void> {
    if (parentId !== null) await this.getOwn(parentId);

    const all = await this.contentRepo.findAll({
      attributes: ['id', 'parentId'],
      });
    const parents = new Map(
      all.map((item) => [item.id, item.parentId ?? null]),
    );
    const settings = await this.settingsRepo.findOne({
      where: {
        userId: SITE_OWNER,
        listKey: CONTENTS_LIST,
      },
    });

    const error =
      (id === null ? null : parentError(id, parentId, parents)) ??
      depthError(parents, id, parentId, listMaxDepth(settings, CONTENTS_LIST));
    if (error) throw new BadRequestException(error);
  }

  /** Код типа — по настройке списка «Символьный код записей». */
  private async assertCode(id: number | null, code: string): Promise<void> {
    const settings = await this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey: CONTENTS_LIST },
    });
    await assertRecordCode(settings, code, async (value) => {
      const count = await this.contentRepo.count({
        where: { code: value, ...(id === null ? {} : { id: { [Op.ne]: id } }) },
      });
      return count > 0;
    });
  }

  /** Сколько элементов в каждом типе: один запрос с группировкой, а не по типу на строку. */
  private async countElements(): Promise<Map<number, number>> {
    const rows = (await this.itemRepo.findAll({
      attributes: ['contentId', [fn('COUNT', col('id')), 'count']],
      group: ['contentId'],
      raw: true,
    })) as unknown as { contentId: number; count: string }[];

    return new Map(
      rows.map((row) => [Number(row.contentId), Number(row.count)]),
    );
  }

  private record(
    userId: number,
    type: Contents,
    action: HistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    author: HistoryAuthor,
    transaction: Transaction,
  ) {
    return this.historyService.record({
      userId,
      entity: CONTENTS_LIST,
      entityId: String(type.id),
      entityCode: type.code,
      entityName: type.name,
      action,
      before,
      after,
      author,
      transaction,
    });
  }
}

/** Плоский снимок для журнала: ключи совпадают с полями карточки. */
const snapshot = (type: Contents): Record<string, unknown> => ({
  code: type.code ?? '',
  name: type.name,
  isActive: type.isActive,
  sort: type.sort,
  parentId: type.parentId ?? null,
});
