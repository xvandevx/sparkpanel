import { ApiProperty } from '@nestjs/swagger';
import { Pages } from '../pages.model';

/**
 * Страница в том виде, в каком её показывает админка. Дерево собирается на фронте
 * из плоского списка (`parentId` + `sort`); всё, что сверх этих полей, — свойства
 * списка: адрес, текст страницы, мета и прочее лежат в значениях свойств.
 * Полный адрес `path` сервер собирает из свойства «Адрес» сам.
 */
export class PageDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'null — страница в корне сайта',
  })
  parentId: number | null;

  @ApiProperty({ example: 500, description: 'Сортировка: порядок среди соседей' })
  sort: number;

  @ApiProperty({
    example: '/about/team',
    description: 'Полный адрес на сайте: свойство «Адрес» по цепочке родителей; у главной — «/»',
  })
  path: string;

  @ApiProperty({ example: 'about', description: 'Символьный код; к адресу не относится' })
  code: string;

  @ApiProperty({ example: 'О компании' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-10-06T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-06T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })
  updatedAt: string;

  @ApiProperty({ example: 3, nullable: true, type: Number, description: 'Кто завёл запись; null — неизвестно' })
  authorId: number | null;

  static from(page: Pages, path: string): PageDto {
    return {
      id: page.id,
      parentId: page.parentId ?? null,
      sort: page.sort,
      path,
      code: page.code ?? '',
      name: page.name,
      isActive: page.isActive,
      createdAt: toIso(page.createdAt),
      updatedAt: toIso(page.updatedAt),
      authorId: page.userId ?? null,
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
