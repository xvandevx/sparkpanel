import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import type { BackupData } from './backup-data';

/** Откуда копия взялась. */
export enum BackupKind {
  /** Сделали кнопкой «Создать копию» */
  Manual = 'manual',
  /** Сняло само восстановление, чтобы его можно было отменить */
  BeforeRestore = 'before-restore',
  /** Загрузили из файла */
  Upload = 'upload',
}

interface InfoblockBackupCreationAttrs {
  settingsId: number;
  listKey: string;
  kind: BackupKind;
  note: string;
  recordsCount: number;
  propertiesCount: number;
  size: number;
  authorId: number;
  authorEmail: string;
  data: BackupData;
}

/**
 * Резервная копия одного списка. Привязана к настройкам списка, как и всё
 * внутри него, и, как он, общая на сайт. Сама копия —
 * JSON в `data`; счётчики лежат колонками, чтобы список копий не читал её целиком.
 */
@Table({
  tableName: 'infoblock_backups',
  indexes: [{ fields: ['settingsId'] }],
})
export class InfoblockBackup extends Model<
  InfoblockBackup,
  InfoblockBackupCreationAttrs
> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 7, description: 'Настройки списка, чья это копия' })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: { model: 'infoblock_settings', key: 'id' },
    onDelete: 'CASCADE',
  })
  settingsId: number;

  @ApiProperty({ example: 'products', description: 'Ключ списка' })
  @Column({ type: DataType.STRING, allowNull: false })
  listKey: string;

  @ApiProperty({ enum: BackupKind, example: BackupKind.Manual })
  @Column({ type: DataType.STRING, allowNull: false })
  kind: BackupKind;

  @ApiProperty({
    example: 'Перед загрузкой прайса',
    description: 'Подпись; пусто — без подписи',
  })
  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  note: string;

  @ApiProperty({ example: 248 })
  @Column({ type: DataType.INTEGER, allowNull: false })
  recordsCount: number;

  @ApiProperty({ example: 12 })
  @Column({ type: DataType.INTEGER, allowNull: false })
  propertiesCount: number;

  @ApiProperty({ example: 188416, description: 'Размер копии, байт' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  size: number;

  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, allowNull: false })
  authorId: number;

  @ApiProperty({ example: 'admin@example.com' })
  @Column({ type: DataType.STRING, allowNull: false })
  authorEmail: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  data: BackupData;
}
