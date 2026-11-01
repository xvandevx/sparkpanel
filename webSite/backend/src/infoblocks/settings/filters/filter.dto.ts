import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

/**
 * Ключ поля фильтра — тот же, что у колонки таблицы: поле записи (`name`,
 * `isActive`) или свойство (`property-12`). Какие поля у записей есть, знает
 * раздел на фронте, поэтому проверяется только вид ключа.
 */
const FILTER_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]{0,63}$/;

/**
 * Набор полей фильтра целиком — по порядку строки фильтра. Пишется целиком,
 * как и вид таблицы: убрать поле — сдвинуть соседей. Пустой — фильтра нет.
 * Что в полях выбрано, сюда не входит: это в адресе страницы у того, кто смотрит.
 */
export class SaveInfoblockFiltersDto {
  @ApiProperty({ type: [String], example: ['name', 'property-12'] })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique({ message: 'Поле фильтра указано дважды' })
  @IsString({ each: true })
  @Matches(FILTER_KEY_PATTERN, { each: true, message: 'Неверный ключ поля фильтра' })
  keys: string[];
}
