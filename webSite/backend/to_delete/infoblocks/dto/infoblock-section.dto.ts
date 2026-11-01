import { ApiProperty } from '@nestjs/swagger';
import { InfoblockSections } from '../infoblock-section.model';
import { InfoblockDto } from './infoblock.dto';

/**
 * Раздел вместе со своими инфоблоками: левая панель раздела показывает всю
 * структуру сразу, и отдельный запрос за инфоблоками каждого раздела означал бы
 * запрос на строку дерева.
 */
export class InfoblockSectionDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер раздела' })
  id: number;

  @ApiProperty({ example: 100 })
  position: number;

  @ApiProperty({ example: 'content', description: 'Код раздела' })
  code: string;

  @ApiProperty({ example: 'Контент сайта' })
  name: string;

  @ApiProperty({ example: 'Всё, что редакторы наполняют сами', nullable: true })
  description: string | null;

  @ApiProperty({ type: [InfoblockDto], description: 'Инфоблоки раздела по порядку' })
  blocks: InfoblockDto[];

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  updatedAt: string;

  static from(section: InfoblockSections, blocks: InfoblockDto[] = []): InfoblockSectionDto {
    return {
      id: section.id,
      position: section.position,
      code: section.code,
      name: section.name,
      description: section.description ?? null,
      blocks,
      createdAt: toIso(section.createdAt),
      updatedAt: toIso(section.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
