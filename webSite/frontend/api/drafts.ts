import { api, PropertyValueDto, RecordDraftDto, RecordDraftStateDto } from '../src/api/client';

/**
 * Черновики записей любого списка — отложенное сохранение: изменённые поля
 * записи и свойства, ещё не записанные в раздел. Публикует их тот же
 * `PATCH` раздела и значений, что и обычное «Сохранить»; здесь — только
 * хранение черновика и его снятие.
 */

/** Изменённое относительно опубликованного: поля записи и свойства по номерам. */
export interface DraftBody {
  fields: Record<string, unknown>;
  values: { propertyId: number; value: unknown }[];
  /** Запись только что заведена черновиком — на сайте её нет до публикации */
  isNew?: boolean;
}

/** Черновик одной записи — карточке, открытой не со страницы таблицы. */
export const fetchRecordDraft = async (listKey: string, recordId: string): Promise<RecordDraftStateDto> => {
  const { data } = await api.infoblockDrafts.draftsControllerFindOne(listKey, recordId);
  return data;
};

/** Сохранить черновик целиком: что сейчас отличается от опубликованного. */
export const saveRecordDraft = async (
  listKey: string,
  recordId: string,
  body: DraftBody,
): Promise<RecordDraftDto> => {
  const { data } = await api.infoblockDrafts.draftsControllerSave(listKey, recordId, {
    fields: body.fields,
    // Значение в сгенерированном клиенте — `object`: «что угодно» OpenAPI не выразит
    values: body.values as unknown as PropertyValueDto[],
    isNew: body.isNew,
  });
  return data;
};

/** Удалить черновик: запись возвращается к опубликованному. */
export const discardRecordDraft = async (listKey: string, recordId: string): Promise<void> => {
  await api.infoblockDrafts.draftsControllerDiscard(listKey, recordId);
};

/** Снять черновик после того, как его поля и значения записаны маршрутами раздела. */
export const publishRecordDraft = async (listKey: string, recordId: string): Promise<void> => {
  await api.infoblockDrafts.draftsControllerPublish(listKey, recordId);
};
