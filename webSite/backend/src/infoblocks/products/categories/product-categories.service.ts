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
import { HistoryAuthor, HistoryService } from '../../history/history.service';
import { listMaxDepth, SITE_OWNER } from '../../settings/infoblock-kinds';
import { assertRecordCode } from '../../settings/record-code';
import { InfoblockSettings } from '../../settings/settings.model';
import { depthError } from '../../settings/tree-depth';
import { PropertyValue } from '../../values/property-values.model';
import { PropertyValuesService } from '../../values/property-values.service';
import { parentError } from '../../values/records-tree';
import { CATEGORIES_LIST } from '../product-lists';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategoryDto } from './dto/product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategories } from './product-categories.model';

/**
 * Категории товаров — дерево редактора контента. Какие товары в категории,
 * здесь не хранится: это значения системного свойства «Категории» у товаров.
 * Отсюда они только читаются — чтобы не удалить категорию, в которой лежат товары.
 */
@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectModel(ProductCategories)
    private readonly categoryRepo: typeof ProductCategories,
    // Значения свойств и настройки списка только читаются: привязки и предел вложенности
    @InjectModel(PropertyValue)
    private readonly valueRepo: typeof PropertyValue,
    @InjectModel(InfoblockSettings)
    private readonly settingsRepo: typeof InfoblockSettings,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
    private readonly values: PropertyValuesService,
  ) {}

  /** Категории пользователя плоским списком (дерево собирает фронт), по алфавиту. */
  async findAll(): Promise<ProductCategoryDto[]> {
    const [categories, linked] = await Promise.all([
      this.categoryRepo.findAll({
        order: [
          ['sort', 'ASC'],
          ['name', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      this.linkedIds(),
    ]);
    return categories.map((category) =>
      ProductCategoryDto.from(category, linked.has(String(category.id))),
    );
  }

  async create(
    userId: number,
    dto: CreateProductCategoryDto,
    author: HistoryAuthor,
  ): Promise<ProductCategoryDto> {
    const parentId = dto.parentId ?? null;
    await this.assertParent(null, parentId);
    await this.assertCode(null, dto.code ?? '');

    return this.sequelize.transaction(async (transaction) => {
      const category = await this.categoryRepo.create(
        {
          userId,
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
        category,
        HistoryAction.Create,
        null,
        snapshot(category),
        author,
        transaction,
      );
      return ProductCategoryDto.from(category, false);
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateProductCategoryDto,
    author: HistoryAuthor,
  ): Promise<ProductCategoryDto> {
    const category = await this.getOwn(id);
    const before = snapshot(category);
    if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
      await this.assertParent(category.id, dto.parentId);
    }
    await this.assertCode(category.id, dto.code ?? category.code ?? '');

    await this.sequelize.transaction(async (transaction) => {
      await category.update(
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
        category,
        HistoryAction.Update,
        before,
        snapshot(category),
        author,
        transaction,
      );
    });

    const linked = await this.linkedIds();
    return ProductCategoryDto.from(category, linked.has(String(category.id)));
  }

  /**
   * Удаляется только пустая категория. С товарами — нет: у них осталась бы
   * ссылка в никуда, и товар молча пропал бы из каталога. С вложенными — тоже
   * нет: сносить ветку целиком — не то, чего ждут от клика по корзине.
   */
  async remove(userId: number, id: number, author: HistoryAuthor): Promise<void> {
    const category = await this.getOwn(id);

    if ((await this.linkedIds()).has(String(category.id))) {
      throw new ConflictException('К категории привязаны товары — сначала уберите её у них');
    }
    if (
      (await this.categoryRepo.count({
        where: { parentId: category.id },
      })) > 0
    ) {
      throw new ConflictException(
        'В категории есть вложенные категории — сначала удалите или перенесите их',
      );
    }

    await this.sequelize.transaction(async (transaction) => {
      await this.record(
        userId,
        category,
        HistoryAction.Delete,
        snapshot(category),
        null,
        author,
        transaction,
      );
      await category.destroy({ transaction });
    });

    // Категория — запись своего списка: её собственные значения свойств уходят вместе с ней
    await this.values.remove(CATEGORIES_LIST, [String(category.id)]);
  }

  /** Категория пользователя или 404: чужая неотличима от несуществующей. */
  private async getOwn(id: number): Promise<ProductCategories> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Категория не найдена');
    return category;
  }

  /**
   * Куда можно положить категорию: в свою категорию, не в собственную ветку
   * и не глубже «Уровней вложенности» списка. Предел проверяется и при переносе
   * в корень: ветка, которая глубже уменьшенного предела, туда тоже не встанет.
   */
  private async assertParent(
    id: number | null,
    parentId: number | null,
  ): Promise<void> {
    if (parentId !== null) await this.getOwn(parentId);

    const all = await this.categoryRepo.findAll({
      attributes: ['id', 'parentId'],
      });
    const parents = new Map(all.map((item) => [item.id, item.parentId ?? null]));
    const settings = await this.settingsRepo.findOne({
      where: {
        userId: SITE_OWNER,
        listKey: CATEGORIES_LIST,
      },
    });

    const error =
      (id === null ? null : parentError(id, parentId, parents)) ??
      depthError(parents, id, parentId, listMaxDepth(settings, CATEGORIES_LIST));
    if (error) throw new BadRequestException(error);
  }

  /** Код категории — по настройке списка «Символьный код записей». */
  private async assertCode(id: number | null, code: string): Promise<void> {
    const settings = await this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey: CATEGORIES_LIST },
    });
    await assertRecordCode(settings, code, async (value) => {
      const count = await this.categoryRepo.count({
        where: { code: value, ...(id === null ? {} : { id: { [Op.ne]: id } }) },
      });
      return count > 0;
    });
  }

  /**
   * Номера категорий, на которые ведёт хоть одна привязка к контенту. Ищем
   * по самим значениям, а не по свойству «Категории»: категорию могли выбрать
   * и в своём свойстве другого списка. Владельца у значений нет, но номер
   * категории сквозной — чужие под ним не встретятся.
   */
  private async linkedIds(): Promise<Set<string>> {
    const rows = await this.valueRepo.findAll({
      attributes: ['json'],
      where: { json: { listKey: CATEGORIES_LIST } },
    });
    return new Set(rows.map((row) => String((row.json as { recordId?: unknown }).recordId)));
  }

  private record(
    userId: number,
    category: ProductCategories,
    action: HistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    author: HistoryAuthor,
    transaction: Transaction,
  ) {
    return this.historyService.record({
      userId,
      entity: CATEGORIES_LIST,
      entityId: String(category.id),
      entityCode: category.code,
      entityName: category.name,
      action,
      before,
      after,
      author,
      transaction,
    });
  }
}

/** Плоский снимок для журнала: ключи совпадают с полями карточки. */
const snapshot = (category: ProductCategories): Record<string, unknown> => ({
  code: category.code ?? '',
  name: category.name,
  isActive: category.isActive,
  sort: category.sort,
  parentId: category.parentId ?? null,
});
