import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface FileSectionCreationAttrs {
  userId: number;
  code: string;
  name: string;
}

/**
 * Раздел медиатеки: banners, news, catalog. Справочник плоский — вложенности нет:
 * файлы группируют по назначению, а не по дереву сайта.
 */
@Table({
  tableName: 'file_sections',
  indexes: [
    { fields: ['userId'] },
    {
      // Код — то, чем раздел называют в шаблонах сайта, и он должен быть один.
      // Проверки в сервисе мало: два параллельных запроса пройдут её оба.
      name: 'file_sections_user_code',
      unique: true,
      fields: ['userId', 'code'],
    },
  ],
})
export class FileSections extends Model<FileSections, FileSectionCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер раздела' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец раздела' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 'banners', description: 'Код раздела — по нему его зовут из шаблонов' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Баннеры', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;
}
