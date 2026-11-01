import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Storages } from '../storages.model';
import { SortField } from '../../record-sort';

/**
 * Хранилище в том виде, в каком его показывает админка. Подключения здесь нет:
 * это значения свойств списка, они приходят своим маршрутом, а секрет — никак.
 */
export class StorageDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Yandex Object Storage' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({ example: 12, description: 'Сколько файлов лежит в этом хранилище' })
  filesCount: number;

  @ApiProperty({
    example: false,
    description: 'Хранилище выбрано для новых файлов или в нём лежат файлы — удалить нельзя',
  })
  isBlocked: boolean;

  @ApiProperty({ example: '2026-10-20T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-20T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })
  updatedAt: string;

  static from(storage: Storages, filesCount: number, isSelected: boolean): StorageDto {
    return {
      id: storage.id,
      name: storage.name,
      isActive: storage.isActive,
      sort: storage.sort,
      filesCount,
      isBlocked: isSelected || filesCount > 0,
      createdAt: toIso(storage.createdAt),
      updatedAt: toIso(storage.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Новое хранилище. Подключение уходит вторым запросом, значениями свойств. */
export class SaveStorageDto {
  @ApiProperty({ example: 'Yandex Object Storage' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: true, description: 'Не прислали — у нового «да», у сохранённого прежнее' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @SortField()
  sort?: number;
}

/** Правка: присылают только то, что меняется, — быстрые действия таблицы шлют одну активность. */
export class UpdateStorageDto extends PartialType(SaveStorageDto) {}
