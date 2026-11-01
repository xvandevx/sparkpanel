import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Сортировка записи по умолчанию — у любого списка редактора, кроме файлов.
 * С запасом в обе стороны: запись, которую нужно поставить выше или ниже
 * остальных, получает меньшее или большее число, не трогая соседей.
 */
export const DEFAULT_SORT = 500;

/**
 * Поле «Сортировка» в теле записи — одно на все списки. Пустое (`null`) —
 * то же, что не прислали: у новой записи 500, у сохранённой прежнее.
 * Стереть сортировку нельзя — колонка обязательная.
 */
export const SortField = () =>
  applyDecorators(
    ApiPropertyOptional({ example: DEFAULT_SORT, description: 'Сортировка; не прислали — 500 или прежняя' }),
    Transform(({ value }) => value ?? undefined),
    IsOptional(),
    IsInt(),
    Min(0),
  );
