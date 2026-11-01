import { ApiProperty } from '@nestjs/swagger';
import { Domains } from '../domains.model';

/** Домен в том виде, в каком его показывает админка. */
export class DomainDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер домена' })
  id: number;

  @ApiProperty({ example: 100 })
  position: number;

  @ApiProperty({ example: 'example.com', description: 'Имя хоста без протокола и пути' })
  host: string;

  @ApiProperty({ example: true, description: 'Основной домен сайта' })
  isMain: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'Домен интернет-магазина', nullable: true })
  note: string | null;

  @ApiProperty({ example: '2026-10-03T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-03T10:00:00.000Z' })
  updatedAt: string;

  static from(domain: Domains): DomainDto {
    return {
      id: domain.id,
      position: domain.position,
      host: domain.host ?? '',
      isMain: domain.isMain,
      isActive: domain.isActive,
      note: domain.note ?? null,
      createdAt: toIso(domain.createdAt),
      updatedAt: toIso(domain.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
