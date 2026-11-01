import { ApiProperty } from '@nestjs/swagger';
import { ContentItems } from '../content-items.model';

/** Элемент типа контента в том виде, в каком его показывает админка. Дерево собирает фронт. */
export class ContentItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  contentId: number;

  @ApiProperty({
    example: null,
    nullable: true,
    type: Number,
    description: 'null — в корне',
  })
  parentId: number | null;

  @ApiProperty({ example: 'opening' })
  code: string;

  @ApiProperty({ example: 'Мы открылись' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({ example: '2026-10-23T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-23T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  @ApiProperty({ example: 3, nullable: true, type: Number, description: 'Кто завёл запись; null — неизвестно' })
  authorId: number | null;

  static from(item: ContentItems): ContentItemDto {
    return {
      id: item.id,
      contentId: item.contentId,
      parentId: item.parentId ?? null,
      code: item.code ?? '',
      name: item.name,
      isActive: item.isActive,
      sort: item.sort,
      createdAt: toIso(item.createdAt),
      updatedAt: toIso(item.updatedAt),
      authorId: item.userId ?? null,
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
