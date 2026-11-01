import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Ключ колонки: поле записи (`name`, `isActive`) или свойство (`property-12`).
 * Какие поля у записей есть, знает раздел на фронте, а не сервер, — поэтому
 * проверяется только вид ключа. Колонку, которой у раздела больше нет,
 * таблица просто не покажет.
 */
const COLUMN_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]{0,63}$/;

/** Одна видимая колонка таблицы. Порядок — место в массиве. */
export class InfoblockColumnDto {
  @ApiProperty({ example: 'name', description: 'Поле записи или свойство (`property-12`)' })
  @IsString()
  @Matches(COLUMN_KEY_PATTERN, { message: 'Неверный ключ колонки' })
  key: string;

  @ApiProperty({ example: 240, nullable: true, description: 'Ширина, px; null — как задал раздел' })
  @IsOptional()
  @IsInt({ message: 'Ширина колонки — целое число' })
  @Min(40, { message: 'Ширина колонки — не меньше 40 px' })
  @Max(2000, { message: 'Ширина колонки — не больше 2000 px' })
  width: number | null;
}

/**
 * Вид таблицы целиком: видимые колонки слева направо. Пишется целиком, а не
 * по колонке: порядок — свойство всего набора, и сдвиг одной колонки
 * переставляет соседей.
 */
export class SaveInfoblockColumnsDto {
  @ApiProperty({ type: [InfoblockColumnDto] })
  @IsArray()
  // Таблица без колонок — одни значки действий: такой вид сохранять незачем
  @ArrayMinSize(1, { message: 'Оставьте хотя бы одну колонку' })
  @ArrayMaxSize(100)
  @ArrayUnique((column: InfoblockColumnDto) => column.key, {
    message: 'Колонка указана дважды',
  })
  @ValidateNested({ each: true })
  @Type(() => InfoblockColumnDto)
  columns: InfoblockColumnDto[];
}
