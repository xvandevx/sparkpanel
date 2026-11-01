import { formatDateTime } from '../dateFormat';

/** Чистые функции экрана «Настройки → API»: адреса и подписи. */

/** Адрес внешнего API от корня сайта: тот же origin, что у панели. */
export const API_PATH = '/api/v1';

export const SPEC_FILE_NAME = 'spark-api.openapi.json';

/** Полный адрес API — сайт ходит по нему с другого origin. */
export const apiBaseUrl = (origin: string): string => origin + API_PATH;

export const specUrl = (origin: string): string => `${apiBaseUrl(origin)}/openapi.json`;

/** Команда, которая делает из спецификации типы для кода сайта. */
export const typesCommand = (origin: string): string =>
  `npx openapi-typescript ${specUrl(origin)} -o spark-api.d.ts`;

/** Ключ в списке: целиком его не знает никто, кроме того, кто его скопировал. */
export const maskedKey = (keyTail: string): string => `sp_••••••••${keyTail}`;

export const lastUsedText = (lastUsedAt: string | null): string =>
  lastUsedAt === null ? 'Ещё не было' : formatDateTime(lastUsedAt);

/**
 * Права ключа в таблице: «Чтение» или «Чтение и запись: Товары, Категории».
 * Список, которого больше нет (тип контента удалили), — его ключом.
 */
export const keyRightsText = (
  key: { isWritable: boolean; writeLists: string[] | null },
  lists: { listKey: string; name: string }[],
): string => {
  if (!key.isWritable) return 'Чтение';
  if (key.writeLists === null) return 'Чтение и запись: все списки';
  const names = key.writeLists.map((listKey) => lists.find((list) => list.listKey === listKey)?.name ?? listKey);
  return `Чтение и запись: ${names.join(', ')}`;
};

/** Отмечены ли списки, если ключ пишет только в отмеченные. */
export const validateWriteLists = (lists: string[] | undefined): string | null =>
  (lists ?? []).length === 0 ? 'Отметьте списки, куда ключ может писать' : null;

/** Что выбрано в окне создания ключа. */
export interface KeyForm {
  name: string;
  isWritable?: boolean;
  /** Куда пишет: во все списки или в отмеченные */
  writeScope?: 'all' | 'selected';
  writeLists?: string[];
}

/** Окно — в новый ключ: без права записи списков нет, «все» — null. */
export const newApiKeyOf = (form: KeyForm): { name: string; isWritable: boolean; writeLists: string[] | null } => {
  const isWritable = form.isWritable === true;
  return {
    name: form.name,
    isWritable,
    writeLists: isWritable && form.writeScope === 'selected' ? form.writeLists ?? [] : null,
  };
};

/** Списки для галочек — по разделам документации: «Сайт», «Контент», «Каталог». */
export const writeListGroups = (lists: { listKey: string; name: string; group: string }[]) =>
  Array.from(new Set(lists.map((list) => list.group))).map((group) => ({
    group,
    options: lists.filter((list) => list.group === group).map((list) => ({ label: list.name, value: list.listKey })),
  }));

/** Название ключа обязательно: по нему потом решают, какой ключ отзывать. */
export const validateKeyName = (name: string): string | null =>
  (name ?? '').trim() === '' ? 'Укажите, для кого ключ' : null;
