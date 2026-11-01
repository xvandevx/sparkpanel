import { ApiProperty } from '@nestjs/swagger';
import { ProductCategories } from '../product-categories.model';

/** Категория товаров в том виде, в каком её показывает админка. Дерево собирает фронт. */
export class ProductCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: null,
    nullable: true,
    type: Number,
    description: 'null — категория в корне',
  })
  parentId: number | null;

  @ApiProperty({ example: 'sneakers' })
  code: string;

  @ApiProperty({ example: 'Кроссовки' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({
    example: false,
    description: 'К категории привязаны записи (товары) — удалить нельзя',
  })
  isBlocked: boolean;

  @ApiProperty({ example: '2026-10-12T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-12T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  @ApiProperty({ example: 3, nullable: true, type: Number, description: 'Кто завёл запись; null — неизвестно' })
  authorId: number | null;

  static from(category: ProductCategories, isLinked: boolean): ProductCategoryDto {
    return {
      id: category.id,
      parentId: category.parentId ?? null,
      code: category.code ?? '',
      name: category.name,
      isActive: category.isActive,
      sort: category.sort,
      isBlocked: isLinked,
      createdAt: toIso(category.createdAt),
      updatedAt: toIso(category.updatedAt),
      authorId: category.userId ?? null,
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
