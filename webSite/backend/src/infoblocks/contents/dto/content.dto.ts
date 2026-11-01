import { ApiProperty } from '@nestjs/swagger';
import { Contents } from '../contents.model';

/** Тип контента в том виде, в каком его показывает админка. Дерево собирает фронт. */
export class ContentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: null,
    nullable: true,
    type: Number,
    description: 'null — тип в корне',
  })
  parentId: number | null;

  @ApiProperty({ example: 'news' })
  code: string;

  @ApiProperty({ example: 'Новости' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({ example: 12, description: 'Сколько в типе элементов' })
  itemsCount: number;

  @ApiProperty({
    example: false,
    description: 'В типе есть элементы или вложенные типы — удалить нельзя',
  })
  isBlocked: boolean;

  @ApiProperty({ example: '2026-10-23T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-23T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  @ApiProperty({ example: 3, nullable: true, type: Number, description: 'Кто завёл запись; null — неизвестно' })
  authorId: number | null;

  static from(
    type: Contents,
    itemsCount: number,
    hasChildren: boolean,
  ): ContentDto {
    return {
      id: type.id,
      parentId: type.parentId ?? null,
      code: type.code ?? '',
      name: type.name,
      isActive: type.isActive,
      sort: type.sort,
      itemsCount,
      isBlocked: itemsCount > 0 || hasChildren,
      createdAt: toIso(type.createdAt),
      updatedAt: toIso(type.updatedAt),
      authorId: type.userId ?? null,
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
