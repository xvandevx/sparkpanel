import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { PAGE_SIZES } from '../records-page';

/** Ключ поля записи или свойства: `name`, `isActive`, `property-12`. */
const FIELD_KEY = /^[a-zA-Z][a-zA-Z0-9-]{0,63}$/;

/** Список ключей через запятую — в массив; пустые отбрасываются. */
const keyList = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((key) => key.trim())
        .filter((key) => key !== '')
    : value;

/** `true`/`false` строкой — в логическое: параметры адреса приходят строками. */
const flag = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/**
 * Что просят у списка для таблицы: страница, поиск, фильтр, сортировка.
 * Всё в параметрах адреса — `GET` остаётся `GET`, а ссылку с отобранной
 * таблицей можно повторить.
 */
export class RecordsPageQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Номер страницы, с 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, enum: PAGE_SIZES, description: 'Записей на странице; у дерева — записей верхнего уровня' })
  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES as unknown as number[])
  pageSize?: number;

  @ApiPropertyOptional({ example: 'фар', description: 'Строка поиска: номер записи целиком, поля — подстрокой' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    example: 'name,code',
    type: String,
    description: 'Поля записи, по которым ищет строка поиска, через запятую',
  })
  @IsOptional()
  @Transform(keyList)
  @Matches(FIELD_KEY, { each: true })
  searchIn?: string[];

  @ApiPropertyOptional({ example: 'name', description: 'Поле сортировки; нет — по ID, новые сверху' })
  @IsOptional()
  @Matches(FIELD_KEY)
  sort?: string;

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], description: 'Без поля сортировки по умолчанию desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    example: true,
    type: Boolean,
    description: 'Таблица — дерево: страница — записи верхнего уровня со всеми ветками',
  })
  @IsOptional()
  @Transform(flag)
  @IsBoolean()
  isTree?: boolean;

  @ApiPropertyOptional({
    example: true,
    type: Boolean,
    description: 'Только записи с черновиком — вид «Черновики»; плоским списком и у дерева',
  })
  @IsOptional()
  @Transform(flag)
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({
    example: '[{"key":"isActive","kind":"options","codes":["true"]}]',
    description: 'Поля фильтра JSON-массивом: { key, kind: options|text|range|filled, … }',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  filters?: string;
}
