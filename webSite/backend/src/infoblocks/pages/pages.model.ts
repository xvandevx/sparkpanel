import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../record-sort';

interface PageCreationAttrs {
  userId: number;
  parentId: number | null;
  code: string;
  name: string;
  isActive?: boolean;
  sort?: number;
}

@Table({
  tableName: 'infoblock_pages',
  indexes: [{ fields: ['userId'] }, { fields: ['parentId'] }, { name: 'infoblock_pages_code', fields: ['code'] }],
})
/**
 * Страница сайта. Своих полей у неё только стандартные — название, код,
 * активность, сортировка и место в дереве. Адрес — системное свойство «Адрес»
 * (`system-properties.ts`), остальное (текст, мета, что угодно ещё) задают
 * свойствами списка, и лежит оно в значениях свойств.
 */
export class Pages extends Model<Pages, PageCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер страницы' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец страницы' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Родитель в дереве; null — страница лежит в корне сайта',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  parentId: number | null;

  @ApiProperty({ example: 500, description: 'Сортировка: порядок среди соседей' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;

  @ApiProperty({
    example: 'about',
    description: 'Символьный код записи, как у любого списка; к адресу не относится',
  })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  code: string;

  @ApiProperty({ example: 'О компании', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({ example: true })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;
}
