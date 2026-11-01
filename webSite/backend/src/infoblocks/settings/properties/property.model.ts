import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { PropertyType } from './property';

/**
 * Параметры, которые есть только у своего типа: форматы и вес файла,
 * разрешение изображения, размер таблицы, список-источник привязки.
 * Вариантов «Списка» здесь нет — они лежат строками в `list_property_options`.
 * Они разнородные, поэтому лежат одним JSONB, а не десятком почти всегда
 * пустых колонок.
 */
export interface InfoblockPropertyParams {
  formats?: string[];
  maxSizeMb?: number | null;
  maxWidth?: number | null;
  maxHeight?: number | null;
  columns?: number | null;
  headers?: string[];
  linkList?: string;
}

interface InfoblockPropertyCreationAttrs {
  settingsId: number;
  code: string;
  name: string;
  hint?: string;
  type: PropertyType;
  tabId: number | null;
  required: boolean;
  multiple: boolean;
  isMultiDomain: boolean;
  isHidden?: boolean;
  isExternal?: boolean;
  position: number;
  params: InfoblockPropertyParams;
  isBlocked?: boolean;
}

/**
 * Свойство записей списка — строка на свойство. Принадлежит настройкам списка
 * по номеру: ключ списка — строка, и сменись он, свойства остались бы сиротами.
 * Своя таблица нужна, чтобы по значениям свойств можно было искать
 * и сортировать записи, а не только читать их пачкой.
 *
 * Код уникален внутри списка: по нему свойство читает сайт и по нему же
 * хранятся значения записей.
 */
@Table({
  tableName: 'infoblock_settings_properties',
  indexes: [
    {
      name: 'infoblock_settings_properties_settings_code',
      unique: true,
      fields: ['settingsId', 'code'],
    },
  ],
})
export class InfoblockProperty extends Model<InfoblockProperty, InfoblockPropertyCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 7, description: 'Настройки списка, которым принадлежит свойство' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  settingsId: number;

  @ApiProperty({ example: 'price', description: 'Ключ значения в записи' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Цена', description: 'Подпись поля в карточке записи' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: 'Цена с НДС, в рублях',
    description: 'Подсказка под полем в карточке записи; пусто — без подсказки',
  })
  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  hint: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.String })
  @Column({ type: DataType.STRING, allowNull: false })
  type: PropertyType;

  @ApiProperty({
    example: 2,
    nullable: true,
    description: 'Вкладка карточки; null — общая вкладка «Свойства»',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  tabId: number | null;

  @ApiProperty({ example: false, description: 'Без значения запись не сохранить' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  required: boolean;

  @ApiProperty({ example: false, description: 'Несколько значений' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  multiple: boolean;

  /**
   * Колонкой, а не в `params`: это не параметр типа, а правило любого
   * свойства — как обязательность и множественность
   */
  @ApiProperty({ example: false, description: 'Значение своё на домен сайта' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isMultiDomain: boolean;

  /**
   * Значение пишут, но не читают: ни карточка, ни сайт его не получают, а журнал
   * видит только «изменено». Для паролей и ключей — их хватает знать серверу
   */
  @ApiProperty({ example: false, description: 'Значение не отдаётся через API' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isHidden: boolean;

  /**
   * Значение приходит из внешней системы (выгрузка, интеграция): панель его
   * показывает, но не правит — пишет его только внешний источник через MCP
   */
  @ApiProperty({ example: false, description: 'Заполняется из внешнего источника: в панели не правится' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isExternal: boolean;

  @ApiProperty({ example: 100, description: 'Порядок поля в карточке записи' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ type: 'object', description: 'Параметры типа свойства' })
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  params: InfoblockPropertyParams;

  /**
   * Системное свойство: его заводит сам сервер по `system-properties.ts`,
   * и через API оно не меняется и не удаляется — на нём держится что-то
   * вне списка (роль пользователя). Значения у записей правятся как обычно.
   */
  @ApiProperty({ example: false, description: 'Системное: не меняется и не удаляется' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isBlocked: boolean;
}
