import { ApiProperty } from '@nestjs/swagger';
import { History, HistoryAction, HistoryChange } from '../history.model';

/** Запись журнала в том виде, в каком её показывает таблица истории. */
export class HistoryRecordDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'pages' })
  entity: string;

  @ApiProperty({ example: '1' })
  entityId: string;

  @ApiProperty({ example: 'about', nullable: true })
  entityCode: string | null;

  @ApiProperty({ example: 'О компании', nullable: true })
  entityName: string | null;

  @ApiProperty({ enum: HistoryAction, example: HistoryAction.Update })
  action: HistoryAction;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  changes: HistoryChange[];

  @ApiProperty({ type: 'object', nullable: true })
  snapshot: Record<string, unknown> | null;

  @ApiProperty({ example: 1, nullable: true })
  authorId: number | null;

  @ApiProperty({ example: 'Иван', nullable: true })
  authorName: string | null;

  @ApiProperty({ example: 'root@copanel.app', nullable: true })
  authorEmail: string | null;

  @ApiProperty({ example: '127.0.0.1', nullable: true })
  authorIp: string | null;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt: string;

  static from(record: History): HistoryRecordDto {
    return {
      id: record.id,
      entity: record.entity,
      entityId: record.entityId,
      entityCode: record.entityCode ?? null,
      entityName: record.entityName ?? null,
      action: record.action,
      changes: Array.isArray(record.changes) ? record.changes : [],
      snapshot: record.snapshot ?? null,
      authorId: record.authorId ?? null,
      authorName: record.authorName ?? null,
      authorEmail: record.authorEmail ?? null,
      authorIp: record.authorIp ?? null,
      createdAt: record.createdAt?.toISOString?.() ?? String(record.createdAt),
    };
  }
}

/** Итог очистки журнала. */
export class HistoryClearDto {
  @ApiProperty({ example: 12, description: 'Сколько строк журнала стёрто' })
  deleted: number;
}

/** Страница общего журнала: элементы + сколько их всего. */
export class HistoryPageDto {
  @ApiProperty({ type: [HistoryRecordDto] })
  items: HistoryRecordDto[];

  @ApiProperty({ example: 42 })
  total: number;
}
