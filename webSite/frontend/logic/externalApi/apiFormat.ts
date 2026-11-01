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

/** Название ключа обязательно: по нему потом решают, какой ключ отзывать. */
export const validateKeyName = (name: string): string | null =>
  (name ?? '').trim() === '' ? 'Укажите, для кого ключ' : null;
