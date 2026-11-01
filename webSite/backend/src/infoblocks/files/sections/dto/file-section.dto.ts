import { ApiProperty } from '@nestjs/swagger';
import { FileSections } from '../file-sections.model';
import { groupId, propertySectionId, SectionGroup } from '../section-groups';

/**
 * Раздел файлов в том виде, в каком его показывает админка. Номер — строкой:
 * в той же выдаче идут разделы свойств (`property-6`) и группы их списков
 * (`group-pages`) — их в базе нет, и номер раздела с ними путать нельзя.
 */
export class FileSectionDto {
  @ApiProperty({ example: '1', description: 'Номер раздела, раздела свойства (`property-…`) или группы (`group-…`)' })
  id: string;

  @ApiProperty({ example: null, nullable: true, type: String, description: 'null — раздел в корне' })
  parentId: string | null;

  @ApiProperty({ example: 'Баннеры' })
  name: string;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({
    example: false,
    description: 'Не удаляется: раздел свойства или группа — их собирает сервер',
  })
  isBlocked: boolean;

  @ApiProperty({
    example: false,
    description:
      'Раздел свойства или группа: собраны сервером по файлам, в базе их нет — карточки и правки нет'
  })
  isReadOnly: boolean;

  @ApiProperty({
    example: false,
    description: 'Группа разделов свойств одного списка, в названии — путь до списка: файлов в ней нет, перехода тоже',
  })
  isGroup: boolean;

  @ApiProperty({
    example: 6,
    nullable: true,
    type: Number,
    description: 'Свойство раздела свойства: выбор файла в карточке открывается на нём'
  })
  propertyId: number | null;

  @ApiProperty({ example: 12, description: 'Файлов в самом разделе, без вложенных' })
  filesCount: number;

  @ApiProperty({ example: '2026-10-10T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-10T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  @ApiProperty({ example: 3, nullable: true, type: Number, description: 'Кто завёл запись; null — неизвестно' })
  authorId: number | null;

  static from(section: FileSections, filesCount: number): FileSectionDto {
    return {
      id: String(section.id),
      parentId: section.parentId === null || section.parentId === undefined ? null : String(section.parentId),
      name: section.name,
      sort: section.sort,
      isBlocked: false,
      isReadOnly: false,
      isGroup: false,
      propertyId: null,
      filesCount,
      createdAt: toIso(section.createdAt),
      updatedAt: toIso(section.updatedAt),
      authorId: section.userId ?? null,
    };
  }

  /** Группа разделов свойств списка; сортировка 0 — группы выше разделов. */
  static group(group: SectionGroup): FileSectionDto {
    return {
      id: groupId(group.key),
      parentId: null,
      name: group.name,
      sort: 0,
      isBlocked: true,
      isReadOnly: true,
      isGroup: true,
      propertyId: null,
      filesCount: 0,
      createdAt: '',
      updatedAt: '',
      authorId: null,
    };
  }

  /** Раздел свойства: файлы, загруженные через него; `groupKey` null — свойства уже нет. */
  static property(propertyId: number, name: string, groupKey: string | null, filesCount: number): FileSectionDto {
    return {
      id: propertySectionId(propertyId),
      parentId: groupKey === null ? null : groupId(groupKey),
      name,
      sort: 0,
      isBlocked: true,
      isReadOnly: true,
      isGroup: false,
      propertyId,
      filesCount,
      createdAt: '',
      updatedAt: '',
      authorId: null,
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
