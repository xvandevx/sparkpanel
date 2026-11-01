import { ApiProperty } from '@nestjs/swagger';
import { InfoblockElements } from '../infoblock-element.model';

/** Элемент инфоблока в том виде, в каком его показывает админка. */
export class InfoblockElementDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер элемента' })
  id: number;

  @ApiProperty({ example: 1, description: 'Инфоблок, которому принадлежит элемент' })
  infoblockId: number;

  @ApiProperty({ example: 100 })
  position: number;

  @ApiProperty({ example: 'otkrytie-ofisa', description: 'Сегмент адреса элемента' })
  code: string;

  @ApiProperty({ example: 'Открытие нового офиса' })
  name: string;

  @ApiProperty({ example: 'Коротко о главном', nullable: true })
  preview: string | null;

  @ApiProperty({ example: '<p>Полный текст</p>', nullable: true })
  content: string | null;

  @ApiProperty({ example: '/files/1/2026/09/banner.jpg', nullable: true })
  image: string | null;

  @ApiProperty({ example: '2026-09-16', nullable: true, description: 'Дата элемента (YYYY-MM-DD)' })
  date: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: 'object', example: {}, description: 'Произвольные свойства элемента' })
  props: Record<string, unknown>;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  updatedAt: string;

  static from(element: InfoblockElements): InfoblockElementDto {
    return {
      id: element.id,
      infoblockId: element.infoblockId,
      position: element.position,
      code: element.code,
      name: element.name,
      preview: element.preview ?? null,
      content: element.content ?? null,
      image: element.image ?? null,
      date: element.date ?? null,
      isActive: element.isActive,
      props: element.props ?? {},
      createdAt: toIso(element.createdAt),
      updatedAt: toIso(element.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
