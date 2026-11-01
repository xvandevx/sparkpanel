import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../record-sort';

interface ProductCreationAttrs {
  userId: number;
  code: string;
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Товар — запись списка редактора контента с ключом `products`. Своих полей
 * у товара минимум — код, название, активность: цену, описание, картинки
 * заводят свойствами списка, и лежат они в значениях свойств.
 *
 * Категории товара — тоже не колонка: это системное свойство «Категории»
 * (привязка к списку категорий), поэтому товар может лежать в нескольких
 * категориях без отдельной таблицы связей.
 */
@Table({
  tableName: 'infoblock_products',
  indexes: [{ fields: ['userId'] }],
})
export class Products extends Model<Products, ProductCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер товара' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец товара' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({
    example: 'air-max-90',
    description: 'Символьный код; пустой — кода нет',
  })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  code: string;

  @ApiProperty({
    example: 'Кроссовки Air Max 90',
    description: 'Название товара',
  })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Неактивный товар остаётся в админке, но не выводится',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
