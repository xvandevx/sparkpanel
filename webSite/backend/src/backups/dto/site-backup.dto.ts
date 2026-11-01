import { ApiProperty } from '@nestjs/swagger';
import { BackupKind } from '../../infoblocks/backups/backup.model';
import { SiteBackup } from '../site-backup.model';

/** Копия в списке — без самих данных. */
export class SiteBackupDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ enum: BackupKind, enumName: 'SiteBackupKind', example: BackupKind.Manual })
  kind: BackupKind;

  @ApiProperty({ example: 'sparkpanel-site-2026-10-30-3.json.gz', description: 'У загруженной — имя файла, у остальных пусто' })
  note: string;

  @ApiProperty({ example: 38 })
  tablesCount: number;

  @ApiProperty({ example: 12450 })
  rowsCount: number;

  @ApiProperty({ example: 1048576, description: 'Размер файла копии, байт' })
  size: number;

  @ApiProperty({ example: 'admin@example.com' })
  authorEmail: string;

  @ApiProperty()
  createdAt: Date;

  static from(backup: SiteBackup): SiteBackupDto {
    return {
      id: backup.id,
      kind: backup.kind,
      note: backup.note,
      tablesCount: backup.tablesCount,
      rowsCount: backup.rowsCount,
      size: backup.size,
      authorEmail: backup.authorEmail,
      createdAt: backup.createdAt,
    };
  }
}

/** Экран копий: сами копии и сколько сейчас весит то, что попадёт в новую. */
export class SiteBackupsDto {
  @ApiProperty({ type: [SiteBackupDto], description: 'Новые сверху' })
  items: SiteBackupDto[];

  @ApiProperty({ example: 39845888, description: 'Таблицы базы без самих копий, байт' })
  databaseSize: number;
}

/** Тело загрузки файла: поле `file` описано ради Swagger, сам файл кладёт в `req.file` multer. */
export class UploadSiteBackupDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Файл копии — `.json.gz` или `.json`' })
  file: unknown;
}
