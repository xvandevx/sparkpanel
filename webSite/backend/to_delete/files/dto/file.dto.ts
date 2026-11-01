import { ApiProperty } from '@nestjs/swagger';
import { Files } from '../files.model';

/** Картинку в админке показываем превью, остальное — иконкой по типу. */
export const isImageMime = (mimeType: string): boolean => mimeType.startsWith('image/');

/** Файл в том виде, в каком его показывает админка: карточка плюс готовый адрес. */
export class FileDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер файла' })
  id: number;

  @ApiProperty({ example: 1, description: 'Раздел медиатеки' })
  sectionId: number;

  @ApiProperty({ example: 'banner-main.jpg', description: 'Имя файла при загрузке' })
  name: string;

  @ApiProperty({
    example: '/uploads/1/2026/09/9f2c1a0b-banner-main.jpg',
    description: 'Адрес файла; относительный — отдаёт nginx с того же origin',
  })
  url: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: true, description: 'Файл — изображение (по MIME-типу)' })
  isImage: boolean;

  @ApiProperty({ example: 184320, description: 'Размер в байтах' })
  size: number;

  @ApiProperty({ example: 'Баннер на главной', nullable: true })
  description: string | null;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  updatedAt: string;

  static from(file: Files, url: string): FileDto {
    return {
      id: file.id,
      sectionId: file.sectionId,
      name: file.name,
      url,
      mimeType: file.mimeType,
      isImage: isImageMime(file.mimeType),
      size: file.size,
      description: file.description ?? null,
      createdAt: toIso(file.createdAt),
      updatedAt: toIso(file.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
