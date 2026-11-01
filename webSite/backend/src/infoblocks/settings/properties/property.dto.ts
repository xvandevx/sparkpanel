import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PropertyOption, PropertyDef, PropertyType, TABLE_MAX_COLUMNS } from './property';

/**
 * Код свойства — ключ значения в записи и в шаблоне сайта, поэтому формат как у
 * имени переменной: строчные латинские буквы, цифры и подчёркивание.
 */
export const PROPERTY_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Сотня вариантов — это уже справочник, а не список выбора. */
export const PROPERTY_OPTIONS_MAX = 100;

/**
 * Ключ списка-источника привязки: `pages`, `infoblock-elements.3`.
 * Пустая строка — любая запись панели.
 */
export const LINK_LIST_PATTERN = /^([a-z][a-z-]*(\.[1-9][0-9]{0,9})?)?$/;

/**
 * Вариант «Списка». Значение записи хранит его номер, код уходит на сайт,
 * название видит редактор. Формат кода не ограничиваем: в настройках прежних
 * версий вариант был одной строкой и стал кодом сам.
 */
export class PropertyOptionDto implements PropertyOption {
  @ApiProperty({
    example: 7,
    required: false,
    description: 'Номер варианта; его хранит значение записи. Нет — вариант новый',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  id?: number;

  @ApiProperty({ example: 'new', description: 'Ключ варианта на сайте' })
  @IsString()
  @IsNotEmpty()
  // Столько же, сколько у названия: у настроек прежних версий вариант был одной
  // строкой до 255 символов и стал кодом сам — отказать в сохранении такому
  // списку значило бы запереть его настройки навсегда
  @MaxLength(255)
  code: string;

  @ApiProperty({ example: 'Новинка', description: 'Название варианта в карточке записи' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

/**
 * Свойство записей списка — и в ответе, и в теле сохранения настроек.
 *
 * Настройки отдельных типов (форматы, вес, разрешение, размер таблицы) в ответе
 * есть всегда, а в теле необязательны: у чужого типа сервер их всё равно обнулит.
 */
export class InfoblockPropertyDto implements PropertyDef {
  @ApiProperty({ example: 4, description: 'Номер свойства: по нему его правят и удаляют' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ example: 100, required: false, description: 'Порядок поля в карточке записи' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  /**
   * Только в ответе: сервис из тела его не читает, и сделать свойство системным
   * (или обычным) через API нельзя — это решает перечень `system-properties.ts`.
   */
  @ApiProperty({
    example: false,
    required: false,
    description: 'Системное свойство: заводит сервер, не меняется и не удаляется',
  })
  isBlocked?: boolean;

  /** Только в ответе: считает сервер по значениям записей, из тела не читается. */
  @ApiProperty({
    example: false,
    required: false,
    description:
      'Свойство заполнено хотя бы у одной записи: тип тогда меняется только между строкой, текстом и HTML',
  })
  isFilled?: boolean;

  @ApiProperty({ example: 'price', description: 'Ключ значения' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(PROPERTY_CODE_PATTERN, {
    message: 'Код свойства: строчные латинские буквы, цифры и подчёркивание, начиная с буквы',
  })
  code: string;

  @ApiProperty({ example: 'Цена', description: 'Подпись поля в шторке записи' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** Необязательно в теле: без него у нового свойства подсказки нет, у заведённого — стирается */
  @ApiProperty({
    example: 'Цена с НДС, в рублях',
    required: false,
    description: 'Подсказка под полем в карточке записи; пусто — без подсказки',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  hint: string;

  @ApiProperty({ enum: PropertyType, enumName: 'PropertyType', example: PropertyType.String })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiProperty({
    example: 'seo',
    description: 'Код вкладки карточки записи; пустая строка — вкладка «Свойства»',
  })
  @IsString()
  @MaxLength(64)
  tab: string;

  @ApiProperty({ example: false, description: 'Без значения запись не сохранить' })
  @IsBoolean()
  required: boolean;

  @ApiProperty({
    example: false,
    description: 'Несколько значений; можно у любого типа, кроме таблицы',
  })
  @IsBoolean()
  multiple: boolean;

  /**
   * Необязательно в теле: клиенты, которые про домены не знают, присылают
   * свойство без него — у нового это «выключено», у заведённого — «как было»
   */
  @ApiProperty({
    example: false,
    description:
      'Мультидоменное: значение своё на домен — общее для всех и свои у отдельных доменов и поддоменов',
  })
  @IsOptional()
  @IsBoolean()
  isMultiDomain: boolean;

  /** Необязательно в теле — по той же причине, что и мультидоменность */
  @ApiProperty({
    example: false,
    description: 'Значение не отдаётся через API: его пишут, но не читают — для паролей и ключей',
  })
  @IsOptional()
  @IsBoolean()
  isHidden: boolean;

  /** Необязательно в теле — по той же причине, что и мультидоменность */
  @ApiProperty({
    example: false,
    description:
      'Заполняется из внешнего источника: в панели значение не правится, его пишет внешняя система через MCP',
  })
  @IsOptional()
  @IsBoolean()
  isExternal: boolean;

  @ApiProperty({
    type: [PropertyOptionDto],
    description: 'Варианты для типа «Список»; у остальных типов пусто',
  })
  @IsArray()
  @ArrayMaxSize(PROPERTY_OPTIONS_MAX)
  @ValidateNested({ each: true })
  @Type(() => PropertyOptionDto)
  options: PropertyOptionDto[];

  @ApiProperty({
    example: ['jpg', 'png'],
    description: 'Допустимые форматы файла или изображения; пусто — любые',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  formats: string[];

  @ApiProperty({ example: 2, nullable: true, description: 'Наибольший вес файла, МБ' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(1024)
  maxSizeMb: number | null;

  @ApiProperty({ example: 1920, nullable: true, description: 'Наибольшая ширина изображения, px' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxWidth: number | null;

  @ApiProperty({ example: 1080, nullable: true, description: 'Наибольшая высота изображения, px' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxHeight: number | null;

  @ApiProperty({
    example: 3,
    nullable: true,
    description: 'Столбцов в таблице; строк в записи сколько угодно',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(TABLE_MAX_COLUMNS)
  columns: number | null;

  @ApiProperty({
    example: ['Параметр', 'Значение'],
    description: 'Заголовки столбцов таблицы; пусто — таблица без шапки',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TABLE_MAX_COLUMNS)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  headers: string[];

  @ApiProperty({
    example: 'infoblock-elements.3',
    description: 'Список-источник привязки к записям контента; обязателен',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(LINK_LIST_PATTERN, { message: 'Неверный ключ списка для привязки' })
  linkList: string;

  @ApiProperty({
    example: 12,
    nullable: true,
    description: 'Привязка к значениям списка: свойство-«Список», варианты которого выбирают',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  optionsPropertyId: number | null;
}
