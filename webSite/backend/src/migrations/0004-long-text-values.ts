import { Migration } from './migration';

/**
 * Длинные строковые значения. Индекс `(propertyId, text)` ограничивал длину
 * значения: строка индекса Postgres не длиннее ~2,7 КБ, и HTML длиннее
 * ~1300 русских букв не сохранялся (500). Теперь индекс по началу строки —
 * первые 200 символов (до 800 байт в UTF-8): для сортировки и поиска
 * по значению этого хватает, а длину значения он больше не ограничивает.
 * Запрос, который захочет им пользоваться, пишет то же выражение:
 * `left(text, 200)`.
 */
export const longTextValues: Migration = {
  name: '0004-long-text-values',
  up: async (sequelize, transaction) => {
    const run = (sql: string) => sequelize.query(sql, { transaction });
    await run(`DROP INDEX IF EXISTS infoblock_values_property_text`);
    await run(
      `CREATE INDEX IF NOT EXISTS infoblock_values_property_text_prefix
       ON infoblock_values ("propertyId", left(text, 200))`,
    );
  },
};
