import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BackupKind, InfoblockBackup } from '../backup.model';

/** Копия в списке копий — без самих данных. */
export class BackupDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ enum: BackupKind, example: BackupKind.Manual })
  kind: BackupKind;

  @ApiProperty({ example: 'Перед загрузкой прайса' })
  note: string;

  @ApiProperty({ example: 248 })
  recordsCount: number;

  @ApiProperty({ example: 12 })
  propertiesCount: number;

  @ApiProperty({ example: 188416, description: 'Размер, байт' })
  size: number;

  @ApiProperty({ example: 'admin@example.com' })
  authorEmail: string;

  @ApiProperty()
  createdAt: Date;

  static from(backup: InfoblockBackup): BackupDto {
    return {
      id: backup.id,
      kind: backup.kind,
      note: backup.note,
      recordsCount: backup.recordsCount,
      propertiesCount: backup.propertiesCount,
      size: backup.size,
      authorEmail: backup.authorEmail,
      createdAt: backup.createdAt,
    };
  }
}

export class CreateBackupDto {
  @ApiPropertyOptional({ example: 'Перед загрузкой прайса' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class UploadBackupDto extends CreateBackupDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Содержимое файла копии, как его выдаёт «Скачать»',
  })
  @IsObject()
  data: Record<string, unknown>;
}

/** Как вернуть копию. */
export enum RestoreMode {
  /** Список становится ровно таким, как в копии */
  Replace = 'replace',
  /** Возвращаются только записи, которых сейчас нет; остальное не трогается */
  Missing = 'missing',
}

export class RestoreBackupDto {
  @ApiProperty({ enum: RestoreMode, example: RestoreMode.Replace })
  @IsIn(Object.values(RestoreMode))
  mode: RestoreMode;

  @ApiProperty({
    example: true,
    description: 'Вернуть записи и значения их свойств',
  })
  @IsBoolean()
  isRecords: boolean;

  @ApiProperty({
    example: true,
    description:
      'Вернуть настройки: свойства, варианты, вкладки, поля фильтра. Только при замене',
  })
  @IsBoolean()
  isSettings: boolean;
}

export class BackupCountsDto {
  @ApiProperty({ example: 248 })
  current: number;

  @ApiProperty({ example: 231 })
  copy: number;
}

/** Что изменится, если вернуть копию, — показать до того, как нажали «Восстановить». */
export class BackupCheckDto {
  @ApiProperty({ type: BackupCountsDto })
  records: BackupCountsDto;

  @ApiProperty({ type: BackupCountsDto })
  properties: BackupCountsDto;

  @ApiProperty({
    example: 17,
    description: 'Есть сейчас, в копии нет: при замене удалятся',
  })
  removedRecords: number;

  @ApiProperty({
    example: 1,
    description: 'Есть сейчас, в копии нет, но защищены — останутся',
  })
  keptRecords: number;

  @ApiProperty({
    example: 3,
    description: 'Есть в копии, сейчас нет: вернутся',
  })
  returnedRecords: number;

  @ApiProperty({ example: 64, description: 'Есть и там, и там, но отличаются' })
  changedRecords: number;

  @ApiProperty({
    example: ['Скидка'],
    type: [String],
    description:
      'Свойства, которых в копии нет: при замене настроек удалятся со значениями',
  })
  removedProperties: string[];

  @ApiProperty({
    example: 2,
    description: 'Значения «Файл»/«Изображение» из копии на удалённые файлы',
  })
  missingFiles: number;
}
