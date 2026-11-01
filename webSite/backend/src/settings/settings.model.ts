import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface SettingsCreationAttrs {
  key: string;
  value: string;
}

/**
 * Настройка сайта — строка на настройку: ключ и значение. Новая настройка
 * не требует новой колонки: это новый ключ в `SETTINGS_DEFAULTS`
 * (`settings-values.ts`). Нет строки — у настройки значение по умолчанию.
 *
 * Владельца у строки нет: настройки общие на весь сайт, а не у каждого
 * пользователя панели свои. Значение — текст: все настройки сегодня строки.
 * Ключи внешнего хранилища лежат здесь же открытым текстом: наружу секрет
 * не отдаётся никогда, но базу с ним надо беречь так же, как `.env`.
 */
@Table({
  tableName: 'settings',
  indexes: [
    {
      // Ключ встречается один раз. На этом индексе держится upsert: два
      // параллельных сохранения не заведут вторую строку того же ключа
      name: 'settings_key',
      unique: true,
      fields: ['key'],
    },
  ],
})
export class Settings extends Model<Settings, SettingsCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 'siteName', description: 'Ключ настройки' })
  @Column({ type: DataType.STRING(64), allowNull: false })
  key: string;

  @ApiProperty({ example: 'CoPanel', description: 'Значение настройки' })
  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  value: string;
}
