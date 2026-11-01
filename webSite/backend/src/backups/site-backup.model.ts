import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { BackupKind } from '../infoblocks/backups/backup.model';
import { SITE_BACKUPS_TABLE } from './site-dump';

interface SiteBackupCreationAttrs {
  kind: BackupKind;
  note: string;
  tablesCount: number;
  rowsCount: number;
  size: number;
  authorId: number;
  authorEmail: string;
  data: Buffer;
}

/**
 * Резервная копия всей базы. Сама копия — сжатый JSON в `data`; счётчики
 * лежат колонками, чтобы список копий её не читал.
 *
 * Внешних ключей у таблицы нет намеренно: восстановление стирает все таблицы
 * разом (`TRUNCATE`), и ссылка отсюда на пользователя не дала бы его стереть.
 * Автор поэтому записан и номером, и адресом.
 */
@Table({ tableName: SITE_BACKUPS_TABLE })
export class SiteBackup extends Model<SiteBackup, SiteBackupCreationAttrs> {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  kind: BackupKind;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  note: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  tablesCount: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  rowsCount: number;

  /** Размер сжатой копии, байт — столько весит и скачанный файл. */
  @Column({ type: DataType.INTEGER, allowNull: false })
  size: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  authorId: number;

  @Column({ type: DataType.STRING, allowNull: false })
  authorEmail: string;

  @Column({ type: DataType.BLOB, allowNull: false })
  data: Buffer;
}
