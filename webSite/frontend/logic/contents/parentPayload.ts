/**
 * Тело записи дерева для сервера. `parentId` переписываем, только если
 * карточка его присылала: `null` в теле — осознанный перенос в корень,
 * а отсутствие ключа — «поле не трогали».
 */
export const toParentPayload = (payload: Record<string, unknown>) => ({
  ...payload,
  ...(payload.parentId === undefined ? {} : { parentId: toRecordId(payload.parentId) }),
});

/** Ключ записи у редактора строковый; в базе запись адресуется числом. */
const toRecordId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
