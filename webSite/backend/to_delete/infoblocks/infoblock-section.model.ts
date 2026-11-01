import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockSectionCreationAttrs {
  userId: number;
  code: string;
  name: string;
  description?: string | null;
  position?: number;
}

/**
 * Раздел инфоблоков: верхний уровень структуры («Контент сайта», «Магазин»).
 * Нужен, чтобы инфоблоки не лежали одним длинным списком — это группировка
 * по назначению, а не по дереву сайта, поэтому справочник плоский:
 * раздел внутри раздела не заводится.
 */
@Table({
  tableName: 'infoblock_sections',
  indexes: [
    { fields: ['userId'] },
    {
      // Код раздела — то, чем его зовут из шаблонов сайта, и он должен быть один.
      // Проверки в сервисе мало: два параллельных запроса пройдут её оба.
      name: 'infoblock_sections_user_code',
      unique: true,
      fields: ['userId', 'code'],
    },
  ],
})
export class InfoblockSections extends Model<InfoblockSections, InfoblockSectionCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер раздела' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец раздела' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 100, description: 'Порядок среди разделов' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ example: 'content', description: 'Код раздела' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Контент сайта', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: 'Всё, что редакторы наполняют сами',
    nullable: true,
    description: 'Пояснение для редактора: что складывают в этот раздел',
  })
  @Column({ type: DataType.TEXT, allowNull: true })
  description: string | null;
}
