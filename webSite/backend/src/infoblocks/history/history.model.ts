import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

export enum HistoryAction {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

/** Одно изменённое поле: ключ формы (`name`, `meta.title`) и значения до/после. */
export interface HistoryChange {
  field: string;
  before: unknown;
  after: unknown;
}

interface HistoryCreationAttrs {
  userId: number;
  entity: string;
  entityId: string;
  entityCode: string | null;
  entityName: string | null;
  action: HistoryAction;
  changes: HistoryChange[];
  snapshot: Record<string, unknown> | null;
  authorId: number | null;
  authorName: string | null;
  authorEmail: string | null;
  authorIp: string | null;
}

/**
 * Журнал изменений — общий на все сущности панели: `entity` хранит тип
 * («pages»), `entityId` — идентификатор записи. Отдельная таблица на каждый
 * раздел не нужна: журнал везде читается одинаково, а редактор контента у нас один.
 */
@Table({
  tableName: 'history',
  updatedAt: false,
  indexes: [
    { fields: ['userId', 'entity', 'createdAt'] },
    { fields: ['entity', 'entityId'] },
  ],
})
export class History extends Model<History, HistoryCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 'pages', description: 'Тип записи: раздел панели' })
  @Column({ type: DataType.STRING, allowNull: false })
  entity: string;

  // Строка, а не число: журнал общий на все разделы, и ключ записи
  // в каком-нибудь из них может оказаться не числовым.
  @ApiProperty({ example: '1' })
  @Column({ type: DataType.STRING, allowNull: false })
  entityId: string;

  @ApiProperty({ example: 'about', nullable: true })
  @Column({ type: DataType.STRING, allowNull: true })
  entityCode: string | null;

  @ApiProperty({ example: 'О компании', nullable: true })
  @Column({ type: DataType.STRING, allowNull: true })
  entityName: string | null;

  @ApiProperty({ enum: HistoryAction, example: HistoryAction.Update })
  @Column({ type: DataType.ENUM(...Object.values(HistoryAction)), allowNull: false })
  action: HistoryAction;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description: 'Изменённые поля: { field, before, after }',
  })
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  changes: HistoryChange[];

  @ApiProperty({
    type: 'object',
    nullable: true,
    description: 'Полное состояние записи после изменения (у удаления — до него)',
  })
  @Column({ type: DataType.JSONB, allowNull: true })
  snapshot: Record<string, unknown> | null;

  @ApiProperty({ example: 1, nullable: true })
  @Column({ type: DataType.INTEGER, allowNull: true })
  authorId: number | null;

  @ApiProperty({ example: 'Иван', nullable: true })
  @Column({ type: DataType.STRING, allowNull: true })
  authorName: string | null;

  @ApiProperty({ example: 'root@copanel.app', nullable: true })
  @Column({ type: DataType.STRING, allowNull: true })
  authorEmail: string | null;

  @ApiProperty({ example: '127.0.0.1', nullable: true })
  @Column({ type: DataType.STRING, allowNull: true })
  authorIp: string | null;
}
