import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { DEFAULT_SORT } from '../record-sort';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { SITE_OWNER } from '../settings/infoblock-kinds';
import { assertRecordCode } from '../settings/record-code';
import { InfoblockSettings } from '../settings/settings.model';
import { PropertyValuesService } from '../values/property-values.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PRODUCTS_LIST } from './product-lists';
import { Products } from './products.model';

/**
 * Товары — плоский список редактора контента. Всё, что сверх кода, названия
 * и активности (цена, описание, картинки, категории), — свойства списка:
 * их значения пишет и читает `infoblocks/values`, здесь их только стирают
 * вместе с товаром.
 */
@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Products) private readonly productRepo: typeof Products,
    // Настройки списка только читаются: правила символьного кода
    @InjectModel(InfoblockSettings) private readonly settingsRepo: typeof InfoblockSettings,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
    private readonly values: PropertyValuesService,
  ) {}

  /** Товары пользователя по алфавиту. */
  async findAll(): Promise<ProductDto[]> {
    const products = await this.productRepo.findAll({
      order: [
        ['sort', 'ASC'],
        ['name', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return products.map(ProductDto.from);
  }

  async create(userId: number, dto: CreateProductDto, author: HistoryAuthor): Promise<ProductDto> {
    await this.assertCode(null, dto.code ?? '');

    return this.sequelize.transaction(async (transaction) => {
      const product = await this.productRepo.create(
        {
          userId,
          code: dto.code ?? '',
          name: dto.name,
          isActive: dto.isActive ?? true,
          sort: dto.sort ?? DEFAULT_SORT,
        },
        { transaction },
      );
      await this.record(
        userId,
        product,
        HistoryAction.Create,
        null,
        snapshot(product),
        author,
        transaction,
      );
      return ProductDto.from(product);
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateProductDto,
    author: HistoryAuthor,
  ): Promise<ProductDto> {
    const product = await this.getOwn(id);
    const before = snapshot(product);
    await this.assertCode(product.id, dto.code ?? product.code ?? '');

    return this.sequelize.transaction(async (transaction) => {
      await product.update(
        {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        },
        { transaction },
      );
      await this.record(
        userId,
        product,
        HistoryAction.Update,
        before,
        snapshot(product),
        author,
        transaction,
      );
      return ProductDto.from(product);
    });
  }

  async remove(userId: number, id: number, author: HistoryAuthor): Promise<void> {
    const product = await this.getOwn(id);

    await this.sequelize.transaction(async (transaction) => {
      await this.record(
        userId,
        product,
        HistoryAction.Delete,
        snapshot(product),
        null,
        author,
        transaction,
      );
      await product.destroy({ transaction });
    });

    // Значения свойств уходят вместе с товаром, и его привязки к категориям
    // тоже: иначе категория так и числилась бы занятой товаром, которого нет
    await this.values.remove(PRODUCTS_LIST, [String(product.id)]);
  }

  private async getOwn(id: number): Promise<Products> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  /** Код товара — по настройке списка «Символьный код записей». */
  private async assertCode(id: number | null, code: string): Promise<void> {
    const settings = await this.settingsRepo.findOne({
      where: { userId: SITE_OWNER, listKey: PRODUCTS_LIST },
    });
    await assertRecordCode(settings, code, async (value) => {
      const count = await this.productRepo.count({
        where: { code: value, ...(id === null ? {} : { id: { [Op.ne]: id } }) },
      });
      return count > 0;
    });
  }

  private record(
    userId: number,
    product: Products,
    action: HistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    author: HistoryAuthor,
    transaction: Transaction,
  ) {
    return this.historyService.record({
      userId,
      entity: PRODUCTS_LIST,
      entityId: String(product.id),
      entityCode: product.code,
      entityName: product.name,
      action,
      before,
      after,
      author,
      transaction,
    });
  }
}

/** Плоский снимок для журнала: ключи совпадают с полями карточки. */
const snapshot = (product: Products): Record<string, unknown> => ({
  code: product.code ?? '',
  name: product.name,
  isActive: product.isActive,
  sort: product.sort,
});
