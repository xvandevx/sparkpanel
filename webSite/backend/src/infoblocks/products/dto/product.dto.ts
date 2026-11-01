import { ApiProperty } from '@nestjs/swagger';
import { Products } from '../products.model';

/**
 * Товар в том виде, в каком его показывает админка. Категорий здесь нет:
 * это значение системного свойства, оно приходит со значениями свойств списка.
 */
export class ProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'air-max-90' })
  code: string;

  @ApiProperty({ example: 'Кроссовки Air Max 90' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({ example: '2026-10-12T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-12T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  @ApiProperty({ example: 3, nullable: true, type: Number, description: 'Кто завёл запись; null — неизвестно' })
  authorId: number | null;

  static from(product: Products): ProductDto {
    return {
      id: product.id,
      code: product.code ?? '',
      name: product.name,
      isActive: product.isActive,
      sort: product.sort,
      createdAt: toIso(product.createdAt),
      updatedAt: toIso(product.updatedAt),
      authorId: product.userId ?? null,
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
