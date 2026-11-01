import { ApiProperty } from '@nestjs/swagger';
import { Infoblocks } from '../infoblock.model';

/** Инфоблок в том виде, в каком его показывает админка. Элементы приходят отдельным запросом. */
export class InfoblockDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер инфоблока' })
  id: number;

  @ApiProperty({ example: 1, description: 'Раздел, в котором лежит инфоблок' })
  sectionId: number;

  @ApiProperty({ example: 100 })
  position: number;

  @ApiProperty({ example: 'news', description: 'Код, по которому инфоблок подключают' })
  code: string;

  @ApiProperty({ example: 'Новости компании' })
  name: string;

  @ApiProperty({ example: 'Выводятся на главной', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'Новость', description: 'Как называется одна запись списка' })
  elementName: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 12, description: 'Сколько в инфоблоке элементов' })
  elementsCount: number;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  updatedAt: string;

  static from(block: Infoblocks, elementsCount = 0): InfoblockDto {
    return {
      id: block.id,
      sectionId: block.sectionId,
      position: block.position,
      code: block.code,
      name: block.name,
      description: block.description ?? null,
      elementName: block.elementName ?? '',
      isActive: block.isActive,
      elementsCount,
      createdAt: toIso(block.createdAt),
      updatedAt: toIso(block.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
