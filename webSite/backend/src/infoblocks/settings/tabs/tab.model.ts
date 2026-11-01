import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockTabCreationAttrs {
  settingsId: number;
  code: string;
  name: string;
  position: number;
}

/**
 * Вкладка карточки записи — строка на вкладку. Принадлежит настройкам списка
 * по номеру: ключ списка — строка, и сменись он, вкладки остались бы сиротами.
 * Свой номер есть и у самой вкладки — по нему на неё ссылается свойство,
 * поэтому переименование и смена кода её не рвут.
 *
 * Порядок вкладок в карточке — `position`, а не место в массиве.
 */
@Table({
  tableName: 'infoblock_settings_tabs',
  indexes: [
    // Код вкладки уникален внутри списка: на него ссылаются свойства
    { name: 'infoblock_settings_tabs_settings_code', unique: true, fields: ['settingsId', 'code'] },
  ],
})
export class InfoblockTab extends Model<InfoblockTab, InfoblockTabCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 7, description: 'Настройки списка, которым принадлежит вкладка' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  settingsId: number;

  @ApiProperty({ example: 'seo', description: 'Ключ вкладки; на него ссылается свойство' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'SEO', description: 'Подпись вкладки в карточке записи' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({ example: 100, description: 'Порядок вкладки в карточке' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;
}
