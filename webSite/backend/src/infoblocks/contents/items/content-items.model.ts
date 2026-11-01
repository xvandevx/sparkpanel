import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../../record-sort';

interface ContentItemCreationAttrs {
  userId: number;
  contentId: number;
  parentId: number | null;
  code: string;
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Элемент типа контента (новость, статья) — запись списка редактора контента
 * с ключом `content-items.<номер типа>`. Своих полей минимум — родитель,
 * код, название, активность: текст, дату, картинки заводят свойствами списка,
 * и у каждого типа они свои.
 */
@Table({
  tableName: 'infoblock_contents_items',
  indexes: [{ fields: ['userId', 'contentId'] }, { fields: ['parentId'] }],
})
export class ContentItems extends Model<
  ContentItems,
  ContentItemCreationAttrs
> {
  @ApiProperty({ example: 1, description: 'Порядковый номер элемента' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец элемента' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({
    example: 1,
    description: 'Тип контента, которому принадлежит элемент',
  })
  @Column({ type: DataType.INTEGER, allowNull: false })
  contentId: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Родитель в дереве — элемент того же типа; null — корень',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  parentId: number | null;

  @ApiProperty({
    example: 'opening',
    description: 'Символьный код; пустой — кода нет',
  })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  code: string;

  @ApiProperty({ example: 'Мы открылись', description: 'Название элемента' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Неактивный элемент остаётся в админке, но не выводится',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
