import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockColumnCreationAttrs {
  userId: number;
  settingsId: number;
  key: string;
  position: number;
  width: number | null;
}

/**
 * Колонка таблицы списка, как её настроил пользователь, — строка на **видимую**
 * колонку. Чего здесь нет, того в таблице не видно; строк нет вовсе — таблица
 * показывает колонки по умолчанию, как их описал раздел. Поэтому «сбросить»
 * значит просто стереть строки: новые колонки раздела тогда появятся сами.
 *
 * Вид таблицы у каждого свой (`userId` — кто смотрит), даже у общих списков:
 * спрятанная колонка не должна пропадать у соседа. Принадлежит настройкам
 * списка по номеру — как вкладки и свойства.
 */
@Table({
  tableName: 'infoblock_settings_columns',
  indexes: [
    // Колонка в виде таблицы одна; запрос всегда идёт по паре (userId, settingsId)
    {
      name: 'infoblock_settings_columns_user_settings_key',
      unique: true,
      fields: ['userId', 'settingsId', 'key'],
    },
  ],
})
export class InfoblockColumn extends Model<InfoblockColumn, InfoblockColumnCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Чей это вид таблицы' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 7, description: 'Настройки списка, таблицу которого настроили' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  settingsId: number;

  @ApiProperty({
    example: 'name',
    description: 'Поле записи (`name`) или свойство списка (`property-12`)',
  })
  @Column({ type: DataType.STRING, allowNull: false })
  key: string;

  @ApiProperty({ example: 0, description: 'Порядок колонки слева направо' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ example: 240, nullable: true, description: 'Ширина, px; null — как задал раздел' })
  @Column({ type: DataType.INTEGER, allowNull: true })
  width: number | null;
}
