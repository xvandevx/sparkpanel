/**
 * Привязка к контенту — запись другого списка: `{ listKey, recordId }`. В поле
 * выбора и в черновике карточки её держат ключом «список/запись» (`roles/3`),
 * тем же, по которому её сверяет сервер: так её узнаёт `Select`, и сравнивать
 * черновик с сохранённым можно строкой, а не объектом.
 */
export interface ContentLink {
  listKey: string;
  recordId: string;
}

/** Привязка — в ключ «список/запись»; не похожее на привязку ключа не даёт. */
export const linkKeyOf = (value: unknown): string | null => {
  const { listKey, recordId } = (value ?? {}) as { listKey?: unknown; recordId?: unknown };
  return typeof listKey === 'string' && typeof recordId === 'string'
    ? `${listKey}/${recordId}`
    : null;
};

/** Ключ «список/запись» — обратно в привязку: в ключе списка слэша не бывает. */
export const linkOf = (key: string): ContentLink => {
  const slash = key.indexOf('/');
  return { listKey: key.slice(0, slash), recordId: key.slice(slash + 1) };
};
