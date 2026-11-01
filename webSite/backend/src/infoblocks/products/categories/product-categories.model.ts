import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../../record-sort';

interface ProductCategoryCreationAttrs {
  userId: number;
  parentId: number | null;
  code: string;
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Категория товаров — запись дерева в разделе «Товары → Категории», список
 * редактора контента с ключом `product-categories`.
 *
 * Товары сюда колонкой не ссылаются: категории товару назначают системным
 * свойством «Категории», и кто в категории, лежит в значениях свойств.
 */
@Table({
  tableName: 'infoblock_products_categories',
  indexes: [{ fields: ['userId'] }, { fields: ['parentId'] }],
})
export class ProductCategories extends Model<ProductCategories, ProductCategoryCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер категории' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец категории' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Родитель в дереве; null — корень',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  parentId: number | null;

  @ApiProperty({
    example: 'sneakers',
    description: 'Символьный код; пустой — кода нет',
  })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  code: string;

  @ApiProperty({ example: 'Кроссовки', description: 'Название категории' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Неактивная категория остаётся в админке, но не выводится',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
