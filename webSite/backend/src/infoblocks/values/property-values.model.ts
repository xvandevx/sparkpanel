import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface PropertyValueCreationAttrs {
  recordId: number;
  propertyId: number;
  sort: number;
  text?: string | null;
  number?: number | null;
  json?: unknown;
  optionId?: number | null;
  domainIds?: number[] | null;
  exceptDomainIds?: number[] | null;
}

/**
 * Одно значение одного свойства одной записи.
 *
 * Строка на значение, а не JSON на запись: по строкам можно искать, фильтровать
 * и сортировать, и значение привязано к **номеру** свойства, а не к его коду —
 * код правят, и значения от этого страдать не должны.
 *
 * Колонка под значение своя у каждого вида, потому что сортировать число
 * как текст нельзя («12» меньше «9»): числа, файлы и изображения ложатся
 * в `number`, таблица и привязка к контенту — в `json` (у них структура,
 * а не значение), вариант «Списка» — в `optionId`, остальное — в `text`.
 * У множественного свойства значений несколько, их порядок — `sort`.
 *
 * У мультидоменного свойства строка ещё и знает, для каких доменов значение:
 * `domainIds` пусто — общее, для всех; иначе — уникальное значение этих
 * доменов. `sort` тогда сквозной по всем группам свойства записи: он же задаёт
 * порядок групп. У немультидоменных свойств обе колонки доменов пусты.
 */
@Table({
  tableName: 'infoblock_values',
  indexes: [
    {
      name: 'infoblock_values_record_property_sort',
      unique: true,
      fields: ['recordId', 'propertyId', 'sort'],
    },
    // По этим и пойдут фильтры с сортировкой по значению свойства. У текста
    // индекс — по началу строки, `left(text, 200)`: строка индекса Postgres
    // не длиннее ~2,7 КБ, а HTML-статья — десятки килобайт. Он выражением,
    // поэтому заводит его миграция (`0004-long-text-values`), а не модель
    { name: 'infoblock_values_property_number', fields: ['propertyId', 'number'] },
    { name: 'infoblock_values_property_option', fields: ['propertyId', 'optionId'] },
    // «Значения для домена» — поиском по массиву доменов
    { name: 'infoblock_values_domains', using: 'GIN', fields: ['domainIds'] },
  ],
})
export class PropertyValue extends Model<PropertyValue, PropertyValueCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 12, description: 'Запись списка (`infoblock_records`)' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  recordId: number;

  @ApiProperty({ example: 4, description: 'Свойство списка' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  propertyId: number;

  @ApiProperty({ example: 0, description: 'Порядок значения у множественного свойства' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sort: number;

  @ApiProperty({ example: 'Новинка', nullable: true, description: 'Строковое значение' })
  @Column({ type: DataType.TEXT, allowNull: true })
  text: string | null;

  @ApiProperty({ example: 1990, nullable: true, description: 'Число, номер файла или изображения' })
  @Column({ type: DataType.DOUBLE, allowNull: true })
  number: number | null;

  @ApiProperty({ nullable: true, description: 'Таблица и привязки: у них структура' })
  @Column({ type: DataType.JSONB, allowNull: true })
  json: unknown;

  /**
   * Выбранный вариант «Списка». Ссылка, а не код: код варианта правят, номер
   * остаётся. Убрали вариант из настроек — его значения у записей уходят следом.
   */
  @ApiProperty({ example: 207, nullable: true, description: 'Вариант списка' })
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: { model: 'infoblock_settings_property_options', key: 'id' },
    onDelete: 'CASCADE',
  })
  optionId: number | null;

  /**
   * Домены уникального значения; null — общее значение, для всех доменов.
   * Массивом, а не ссылками: удаляя домен, его вычищают из значений сами
   * (`PropertyValuesService.forgetDomain`)
   */
  @ApiProperty({ example: [2, 4], nullable: true, type: [Number], description: 'Домены значения; null — для всех' })
  @Column({ type: DataType.ARRAY(DataType.INTEGER), allowNull: true })
  domainIds: number[] | null;

  /** Только у строк общего значения: домены, на которые оно не распространяется */
  @ApiProperty({ example: [3], nullable: true, type: [Number], description: 'Исключения общего значения' })
  @Column({ type: DataType.ARRAY(DataType.INTEGER), allowNull: true })
  exceptDomainIds: number[] | null;
}
