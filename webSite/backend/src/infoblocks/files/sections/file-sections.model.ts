import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../../record-sort';

interface FileSectionCreationAttrs {
  userId: number;
  parentId: number | null;
  name: string;
  sort?: number;
}

/**
 * Раздел файлов — запись дерева в разделе «Файлы». Сами файлы лежат в модуле
 * `files/` и ссылаются сюда номером раздела.
 *
 * Здесь только разделы, которые завёл пользователь. Файлы, загруженные через
 * свойство «Файл»/«Изображение», помнят свойство (`Files.propertyId`), а их
 * разделы и группы сервер собирает при выдаче (`section-groups.ts`).
 */
@Table({
  tableName: 'infoblock_files_sections',
  indexes: [
    { fields: ['userId'] },
    { fields: ['parentId'] },
  ],
})
export class FileSections extends Model<FileSections, FileSectionCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер раздела' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец раздела' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: null, nullable: true, description: 'Родитель в дереве; null — корень' })
  @Column({ type: DataType.INTEGER, allowNull: true })
  parentId: number | null;

  @ApiProperty({ example: 'Баннеры', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
