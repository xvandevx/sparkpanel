import { api, PropertyValueDto, RecordValuesDto } from '../src/api/client';

/**
 * Значения свойств записей. Своя сущность — свой файл, как и на сервере:
 * настройки описывают список, а здесь то, чем его записи заполнили.
 *
 * Свойство адресуется **номером**: код у свойства правят, и значения,
 * подписанные кодом, после переименования терялись бы.
 */

/**
 * Значения одной записи. Записям страницы таблицы они приходят вместе
 * со страницей (`api/records.ts`); отдельно — карточке, открытой не со страницы.
 */
export const fetchRecordValues = async (listKey: string, recordId: string): Promise<RecordValuesDto> => {
  const { data } = await api.infoblockValues.infoblockValuesControllerFindOne(listKey, recordId);
  return data;
};

/**
 * Правка значений записи: уходят только изменённые свойства, остальные сервер
 * не трогает. Чтобы стереть значение, его шлют как `null`. Родителя нет ни
 * в теле, ни в ответе — им владеет раздел записи, а не её значения; в ответ
 * приходят все значения записи, чтобы карточке было чем обновиться.
 */
export const savePropertyValues = async (
  listKey: string,
  recordId: string,
  values: { propertyId: number; value: unknown }[],
): Promise<RecordValuesDto> => {
  const { data } = await api.infoblockValues.infoblockValuesControllerSave(listKey, recordId, {
    // В сгенерированном клиенте значение описано как `object`: «что угодно»
    // OpenAPI выразить не умеет, а значением бывает и строка, и число
    values: values as unknown as PropertyValueDto[],
  });
  return data;
};

/** Стирает значения удалённых записей; ключи уходят в запрос через запятую. */
export const removePropertyValues = async (
  listKey: string,
  recordIds: string[],
): Promise<void> => {
  await api.infoblockValues.infoblockValuesControllerRemove(listKey, recordIds.join(','));
};
