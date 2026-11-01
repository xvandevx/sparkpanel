import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface SettingsCreationAttrs {
  userId: number;
  siteName?: string;
}

/**
 * Настройки сайта — одна строка на пользователя. Не список и не дерево:
 * запись заводится при первом сохранении и дальше только правится.
 *
 * Домены сайта здесь не хранятся: их несколько и у каждого своя карточка,
 * поэтому они живут отдельной сущностью (`domains/`).
 */
@Table({
  tableName: 'settings',
  indexes: [
    {
      // Настройки у пользователя ровно одни. Проверки в сервисе мало: два
      // параллельных сохранения пройдут её оба, индекс же пропустит одно.
      name: 'settings_single_per_user',
      unique: true,
      fields: ['userId'],
    },
  ],
})
export class Settings extends Model<Settings, SettingsCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец настроек' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 'CoPanel', description: 'Название сайта' })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  siteName: string;
}
