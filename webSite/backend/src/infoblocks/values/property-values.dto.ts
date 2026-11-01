import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Allow,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Значение одного свойства записи. Свойство адресуется **номером**: код у него
 * правят, и значения, подписанные кодом, после переименования терялись бы.
 */
export class PropertyValueDto {
  @ApiProperty({ example: 4, description: 'Номер свойства списка' })
  @IsInt()
  propertyId: number;

  @ApiProperty({
    example: 1990,
    description: 'Значение: у множественного свойства — массив значений',
  })
  // Значением бывает что угодно — строка, число, массив, таблица. Проверяет его
  // не DTO, а сервис: правила задают настройки списка. `@Allow` нужен, чтобы
  // глобальный `whitelist` не счёл поле лишним
  @Allow()
  value: unknown;
}

/**
 * Что этот маршрут про запись знает: её значения. Родителя здесь нет —
 * им владеет раздел записи, а не её значения.
 */
export class RecordValuesDto {
  @ApiProperty({ example: 'element-7', description: 'Ключ записи в списке' })
  recordId: string;

  @ApiProperty({ type: [PropertyValueDto], description: 'Заполненные свойства записи' })
  values: PropertyValueDto[];
}

/**
 * То же плюс место записи в дереве — для чтения списка целиком: у списков,
 * которые стали деревом настройкой, родитель хранится здесь же.
 */
export class PropertyValuesDto extends RecordValuesDto {
  @ApiProperty({
    example: 'element-3',
    nullable: true,
    description: 'Родитель в дереве списка; null — запись в корне или список не древовидный',
  })
  parentId: string | null;
}

/**
 * Правка значений записи: присылают только изменённые свойства, остальные
 * остаются как были. Чтобы стереть значение, его присылают как `null`.
 * Проверка по типам свойств — в сервисе: правила задают настройки списка.
 */
export class UpdatePropertyValuesDto {
  @ApiProperty({ type: [PropertyValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyValueDto)
  values: PropertyValueDto[];

  @ApiPropertyOptional({
    example: 'element-3',
    nullable: true,
    description:
      'Родитель записи в дереве списка. Нужен только спискам, у которых дерева нет ' +
      'в своей таблице: у страниц родитель уходит в их собственный запрос, и сюда ' +
      'его не присылают. Не прислали — остаётся прежним',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentId?: string | null;
}
