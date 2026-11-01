import { ApiProperty } from '@nestjs/swagger';
import { Domains } from '../domains.model';

/** Домен в том виде, в каком его показывает админка. Дерево собирает фронт. */
export class DomainDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({
    example: 1,
    nullable: true,
    type: Number,
    description: 'null — домен, иначе поддомен этого домена',
  })
  parentId: number | null;

  @ApiProperty({ example: 'ekb', description: 'Имя: у домена — целиком, у поддомена — его часть' })
  name: string;

  @ApiProperty({
    example: 'ekb.farkop.ru',
    description: 'Полный адрес: у поддомена — вместе с именем домена. Не хранится, складывается',
  })
  address: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({ example: '2026-10-13T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-13T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  static from(domain: Domains, address: string): DomainDto {
    return {
      id: domain.id,
      parentId: domain.parentId ?? null,
      name: domain.name,
      address,
      isActive: domain.isActive,
      sort: domain.sort,
      createdAt: toIso(domain.createdAt),
      updatedAt: toIso(domain.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
