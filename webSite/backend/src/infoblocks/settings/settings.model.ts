import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockSettingsCreationAttrs {
  userId: number;
  listKey: string;
  name: string;
  code: string;
  useCode: boolean;
  codeRequired: boolean;
  codeUnique: boolean;
  maxDepth?: number | null;
  isHistoryEnabled?: boolean;
  isDraftEnabled?: boolean;
}

/**
 * Настройки одного списка панели: имя, код и правила его записей. Вкладки
 * карточки и свойства записей лежат своими строками в `list_tabs`
 * и `list_properties` — по значениям свойств нужно будет искать и сортировать
 * записи, а в массиве JSONB это неудобно.
 * Список задаётся ключом (`pages`, `infoblock-elements.3`), а не ссылкой на
 * таблицу: настройки общие для любого экрана редактора контента.
 */
@Table({
  tableName: 'infoblock_settings',
  indexes: [
    // Одни настройки на список; запрос всегда идёт по паре (userId, listKey)
    { name: 'infoblock_settings_user_key', unique: true, fields: ['userId', 'listKey'] },
    // По коду список находит сайт: два одинаковых кода — непонятно, какой отдавать
    { name: 'infoblock_settings_user_code', unique: true, fields: ['userId', 'code'] },
  ],
})
export class InfoblockSettings extends Model<InfoblockSettings, InfoblockSettingsCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец настроек' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 'infoblock-elements.3', description: 'Ключ списка' })
  @Column({ type: DataType.STRING, allowNull: false })
  listKey: string;

  @ApiProperty({ example: 'Новости', description: 'Имя списка: заголовок над таблицей' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({ example: 'news', description: 'Код, по которому список находит сайт' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({
    example: true,
    description: 'Правило редактора: показывать ли у записей поле «Код»',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  useCode: boolean;

  @ApiProperty({ example: false, description: 'Правило редактора: требовать код у записи' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  codeRequired: boolean;

  @ApiProperty({
    example: false,
    description: 'Правило редактора: сверять код с кодами остальных записей списка',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  codeUnique: boolean;

  @ApiProperty({
    example: 2,
    nullable: true,
    description: 'Уровней вложенности у древовидного списка; null — без ограничения',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  maxDepth: number | null;

  @ApiProperty({
    example: true,
    description: 'Вести журнал изменений: выключен — правки записей списка в историю не пишутся',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isHistoryEnabled: boolean;

  @ApiProperty({
    example: false,
    description:
      'Правки записей сначала сохраняются черновиком (`infoblock_drafts`) и попадают в записи по «Опубликовать»',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isDraftEnabled: boolean;
}

/**
 * Владелец настроек общего списка. Ноль, а не null: на паре (userId, listKey)
 * стоит уникальный индекс, а два null Postgres считает разными — настройки
 * общего списка раздвоились бы.
 *
 * Живёт рядом с моделью, а не в `infoblock-kinds`: его читает и журнал
 * изменений, а `infoblock-kinds` импортирует сервисы разделов, которые сами
 * пишут в журнал, — круг импортов.
 */
export const SITE_OWNER = 0;

/**
 * Настройки списка, которые ещё не сохраняли: имя и код — из ключа списка.
 * Заводит их тот, кто первым пишет внутрь списка (вкладку, свойство, значение),
 * а у списков с системными свойствами — их сверка при старте сервера. Имя и предел
 * вложенности заводящий подставляет по виду списка (`listDefaultName`,
 * `listMaxDepth`): модель не знает видов, их перечень импортирует сервисы.
 */
export const emptySettings = (userId: number, listKey: string): InfoblockSettingsCreationAttrs => ({
  userId,
  listKey,
  name: listKey,
  // `infoblock-elements.3` → `infoblock-elements-3`: точки в коде списка не бывает
  code: listKey.replace(/\./g, '-'),
  // Плоский, пока его не сделали деревом; заводящий настройки подставляет
  // предел своего вида (`listMaxDepth`)
  maxDepth: 1,
  useCode: true,
  codeRequired: false,
  codeUnique: false,
  // Журнал ведётся, пока его не выключили: так списки жили до появления настройки
  isHistoryEnabled: true,
  // Черновиков нет, пока их не включили: правки сохраняются сразу, как и раньше
  isDraftEnabled: false,
});
