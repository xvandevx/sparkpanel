import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockFilterCreationAttrs {
  settingsId: number;
  key: string;
  position: number;
}

/**
 * Поле фильтра таблицы списка — строка на поле, которое поставили в фильтр.
 * Строк нет — фильтра нет.
 *
 * Набор полей один на список для всех, кто его видит, — как вкладки и свойства,
 * он принадлежит настройкам списка по номеру, а не пользователю. У общих
 * списков (пользователи, роли) настройки одни на сайт, значит, и фильтр.
 * Что в полях выбрано, здесь не хранится: это в адресе страницы.
 */
@Table({
  tableName: 'infoblock_settings_filters',
  indexes: [
    // Поле в фильтре одно; запрос всегда идёт по настройкам списка
    {
      name: 'infoblock_settings_filters_settings_key',
      unique: true,
      fields: ['settingsId', 'key'],
    },
  ],
})
export class InfoblockFilter extends Model<InfoblockFilter, InfoblockFilterCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 7, description: 'Настройки списка, таблицу которого фильтруют' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  settingsId: number;

  @ApiProperty({
    example: 'name',
    description: 'Поле записи (`name`) или свойство списка (`property-12`)',
  })
  @Column({ type: DataType.STRING, allowNull: false })
  key: string;

  @ApiProperty({ example: 0, description: 'Порядок поля в строке фильтра' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;
}
