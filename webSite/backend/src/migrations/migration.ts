import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

/**
 * Миграция базы: правка схемы или данных, которую не сделает `sync`. Схема
 * приводится к моделям только для новых таблиц (`alter: false`) — новая
 * колонка, индекс, переименование и перенос данных в существующей таблице
 * пишутся миграцией.
 *
 * Миграция должна переживать повторный запуск: после восстановления копии
 * сайта миграции, которых в копии не было, прогоняются снова — уже на схеме,
 * где они применены. Поэтому `IF NOT EXISTS`, `IF EXISTS` и условия в `WHERE`.
 */
export interface Migration {
  /** Имя: номер по порядку и суть — `0001-shared-list-settings`. Не меняется никогда */
  name: string;
  up: (sequelize: Sequelize, transaction: Transaction) => Promise<void>;
}
