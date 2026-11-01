import type { HistoryPageDto, HistoryRecordDto } from '../../src/api/client';
import type {
  EditorHistoryAction,
  EditorHistoryChange,
  EditorHistoryPage,
  EditorHistoryRecord,
} from './types';

/**
 * Запись журнала с бэкенда — в вид, который понимает редактор контента.
 * Журнал один на все разделы (`change_history`), поэтому и перевод общий:
 * `changes` и `snapshot` приходят из Swagger как `object`, и форма полей
 * восстанавливается здесь, а не расползается приведениями типов по разделам.
 */
export function toEditorHistoryRecord(dto: HistoryRecordDto): EditorHistoryRecord {
  return {
    id: String(dto.id),
    entityId: dto.entityId,
    entityCode: dto.entityCode,
    entityName: dto.entityName,
    action: dto.action as EditorHistoryAction,
    changes: (dto.changes ?? []) as EditorHistoryChange[],
    snapshot: (dto.snapshot ?? null) as Record<string, unknown> | null,
    authorName: dto.authorName,
    authorEmail: dto.authorEmail,
    authorIp: dto.authorIp,
    createdAt: dto.createdAt,
  };
}

export const toEditorHistoryPage = (dto: HistoryPageDto): EditorHistoryPage => ({
  items: (dto.items ?? []).map(toEditorHistoryRecord),
  total: dto.total ?? 0,
});
