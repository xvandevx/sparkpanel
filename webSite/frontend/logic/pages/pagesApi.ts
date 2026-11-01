import { createPage, fetchPages, removePage, updatePage } from '../../api/pages';
import type { CreatePageDto, UpdatePageDto } from '../../src/api/client';


/**
 * Где лежат страницы сайта. Единственное, что раздел рассказывает редактору
 * о данных: грузит, пишет и перечитывает список сам редактор.
 */

/**
 * Общее тело запроса → тело страницы. Числовыми идентификаторы становятся здесь:
 * у редактора ключ записи строковый, как в адресе страницы.
 *
 * `parentId` переписываем, только если карточка его присылала: `null` в теле —
 * это осознанный перенос страницы в корень сайта, а отсутствие ключа —
 * «поле не трогали», и родитель остаётся прежним.
 */
const toPagePayload = (payload: Record<string, unknown>): CreatePageDto | UpdatePageDto =>
  ({
    ...payload,
    ...(payload.parentId === undefined ? {} : { parentId: toPageId(payload.parentId) }),
  }) as CreatePageDto | UpdatePageDto;

/** Ключ записи у редактора строковый; в базе страницы адресуются числом. */
const toPageId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const pagesApi = {
  list: fetchPages,
  create: (payload: Record<string, unknown>) => createPage(toPagePayload(payload) as CreatePageDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updatePage(Number(id), toPagePayload(payload) as UpdatePageDto),
  remove: (id: string) => removePage(Number(id)),
};
