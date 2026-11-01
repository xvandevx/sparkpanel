import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../record-sort';

interface ContentCreationAttrs {
  userId: number;
  parentId: number | null;
  code: string;
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Тип контента («Новости», «Статьи», «Акции») — запись списка редактора
 * контента с ключом `contents`. Своих полей минимум — родитель, код,
 * название, активность; остальное заводят свойствами списка.
 *
 * Название и код типа — они же имя и код списка его элементов
 * (`content-items.<id>`): по коду этот список находит сайт. Сами элементы
 * лежат вложенным модулем `items/` (`infoblock_contents_items`) и ссылаются сюда `contentId`.
 */
@Table({
  tableName: 'infoblock_contents',
  indexes: [{ fields: ['userId'] }, { fields: ['parentId'] }],
})
export class Contents extends Model<Contents, ContentCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер типа' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец типа' })
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
    example: 'news',
    description: 'Символьный код — он же код списка элементов',
  })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  code: string;

  @ApiProperty({
    example: 'Новости',
    description: 'Название — оно же имя списка элементов',
  })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description:
      'Неактивный тип остаётся в админке, но его элементы не выводятся',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
