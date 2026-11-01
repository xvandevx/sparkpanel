import { ApiProperty } from '@nestjs/swagger';
import { FileSections } from '../file-section.model';

/**
 * Раздел медиатеки для админки. Счётчик файлов приходит вместе с разделом:
 * от него зависит, можно ли раздел удалить, и считать его на фронте нечем.
 */
export class FileSectionDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер раздела' })
  id: number;

  @ApiProperty({ example: 'banners', description: 'Код раздела' })
  code: string;

  @ApiProperty({ example: 'Баннеры' })
  name: string;

  @ApiProperty({ example: 12, description: 'Сколько файлов в разделе' })
  filesCount: number;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  updatedAt: string;

  static from(section: FileSections, filesCount: number): FileSectionDto {
    return {
      id: section.id,
      code: section.code,
      name: section.name,
      filesCount,
      createdAt: toIso(section.createdAt),
      updatedAt: toIso(section.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
