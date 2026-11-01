import { ApiProperty } from '@nestjs/swagger';
import { Files } from '../files.model';

/**
 * Привязка файла к записи: запись списка выбрала файл значением своего свойства
 * «Файл» или «Изображение». Ключи те же, что у настроек и значений записей.
 */
export class FileLinkDto {
  @ApiProperty({ example: 'pages', description: 'Ключ списка' })
  listKey: string;

  @ApiProperty({ example: 'Страницы сайта', description: 'Имя списка из его настроек' })
  listName: string;

  @ApiProperty({ example: '2', description: 'Ключ записи в списке' })
  recordId: string;

  @ApiProperty({
    example: 'О компании',
    nullable: true,
    description: 'Название записи; null — список её названий не отдаёт',
  })
  recordName: string | null;

  @ApiProperty({ example: 6 })
  propertyId: number;

  @ApiProperty({ example: 'Обложка', description: 'Свойство, значением которого выбран файл' })
  propertyName: string;
}

/** Файл в том виде, в каком его показывает админка: карточка плюс привязки к записям. */
export class FileDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер файла' })
  id: number;

  @ApiProperty({ example: 1, nullable: true, type: Number, description: 'Раздел файлов; null — загружен через свойство' })
  sectionId: number | null;

  @ApiProperty({
    example: null,
    nullable: true,
    type: Number,
    description: 'Свойство, через которое загружен файл; null — файл в разделе',
  })
  propertyId: number | null;

  @ApiProperty({ example: 'banner-main.jpg', description: 'Имя файла' })
  name: string;

  @ApiProperty({
    example: 'banner-main.jpg',
    description: 'Код файла — имя в адресе, латиницей, с расширением; адрес — папки из номера плюс код',
  })
  code: string;

  @ApiProperty({
    example: '/uploads/00/00/01/banner-main.jpg',
    description:
      'Адрес файла — собран из ключа объекта и хранилища; у встроенного относительный, отдаёт nginx',
  })
  url: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: true, description: 'Файл — изображение (по MIME-типу)' })
  isImage: boolean;

  @ApiProperty({ example: 184320, description: 'Размер в байтах' })
  size: number;

  @ApiProperty({ example: null, nullable: true, type: Number, description: 'Хранилище; null — встроенное' })
  storageId: number | null;

  @ApiProperty({
    example: 'Встроенное',
    description: 'Название хранилища, где лежит файл: «Встроенное» или имя внешнего',
  })
  storageName: string;

  @ApiProperty({ example: '2026-10-10T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-10T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  @ApiProperty({ type: [FileLinkDto], description: 'Записи, выбравшие файл своим свойством' })
  links: FileLinkDto[];

  static from(file: Files, url: string, storageName: string, links: FileLinkDto[]): FileDto {
    return {
      id: file.id,
      sectionId: file.sectionId ?? null,
      propertyId: file.propertyId ?? null,
      name: file.name,
      code: file.code,
      url,
      mimeType: file.mimeType,
      isImage: isImageMime(file.mimeType),
      size: file.size,
      storageId: file.storageId ?? null,
      storageName,
      createdAt: toIso(file.createdAt),
      updatedAt: toIso(file.updatedAt),
      links,
    };
  }
}

/** Картинку в админке показываем превью, остальное — значком. */
export const isImageMime = (mimeType: string): boolean => mimeType.startsWith('image/');

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
