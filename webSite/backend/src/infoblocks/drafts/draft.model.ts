import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** Изменённое свойство в черновике — как его шлёт карточка в `PATCH …/values`. */
export interface DraftValue {
  propertyId: number;
  value: unknown;
}

interface InfoblockDraftCreationAttrs {
  settingsId: number;
  recordKey: string;
  fields: Record<string, unknown>;
  values: DraftValue[];
  isNew: boolean;
  authorId: number;
  authorEmail: string;
}

/**
 * Черновик записи любого списка: отложенное сохранение. В нём лежат ровно те
 * два тела запроса, которые карточка шлёт по «Сохранить», — поля записи для
 * маршрута её раздела и значения свойств для `values/`, — только изменённое
 * относительно опубликованного. «Опубликовать» и есть то самое сохранение:
 * его проверки, журнал и запись в таблицы разделов срабатывают как обычно.
 *
 * Таблицы разделов и значения свойств черновика не видят: в них всегда
 * опубликованная версия. Накладывают черновик поверх только те, кому он нужен, —
 * страница таблицы панели (`records/`) и, когда появится, предпросмотр сайта.
 *
 * Поля записи и свойства — JSON, а не строками: черновик живёт до публикации,
 * а искать и сортировать по нему таблица пока умеет в памяти.
 */
@Table({
  tableName: 'infoblock_drafts',
  indexes: [
    // Черновик у записи один: второй «Сохранить черновик» правит его же
    { name: 'infoblock_drafts_settings_key', unique: true, fields: ['settingsId', 'recordKey'] },
  ],
})
export class InfoblockDraft extends Model<InfoblockDraft, InfoblockDraftCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 7, description: 'Настройки списка, к которому относится запись' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  settingsId: number;

  @ApiProperty({ example: '2', description: 'Ключ записи в её разделе' })
  @Column({ type: DataType.STRING, allowNull: false })
  recordKey: string;

  @ApiProperty({ description: 'Изменённые поля записи — тело PATCH её раздела' })
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  fields: Record<string, unknown>;

  @ApiProperty({ description: 'Изменённые свойства — тело PATCH значений' })
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  values: DraftValue[];

  /**
   * Запись заведена черновиком и ни разу не публиковалась: сайт её не видит.
   * Сама строка в таблице раздела у неё есть — без неё у записи не было бы номера
   */
  @ApiProperty({ example: false })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isNew: boolean;

  /** Кто сохранил черновик последним — из JWT, как автор в журнале */
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, allowNull: false })
  authorId: number;

  @ApiProperty({ example: 'admin@example.com' })
  @Column({ type: DataType.STRING, allowNull: false })
  authorEmail: string;
}
