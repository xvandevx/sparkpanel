import { sharedListSettings } from './0001-shared-list-settings';
import { externalWrite } from './0002-external-write';
import { linkValuesIndex } from './0003-link-values-index';
import { longTextValues } from './0004-long-text-values';
import { Migration } from './migration';

/**
 * Все миграции по порядку применения. Новая — в конец списка, отдельным файлом
 * `NNNN-суть.ts`. Применённую не правят и не удаляют: её имя уже записано
 * в `schema_migrations`, исправление — следующей миграцией.
 */
export const MIGRATIONS: Migration[] = [sharedListSettings, externalWrite, linkValuesIndex, longTextValues];
