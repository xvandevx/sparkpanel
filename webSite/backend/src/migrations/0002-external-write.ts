import { Migration } from './migration';

/**
 * Запись во внешнее API. У записи любого списка появляется внешний ID — номер
 * записи в системе-источнике; он лежит в общей строке записи
 * (`infoblock_records`) и уникален внутри списка, пустые не мешают друг другу.
 * У ключа API — право записи и списки, куда можно писать (null — все);
 * существующие ключи остаются только на чтение.
 *
 * Плюс индексы по коду записи у разделов, которые отдаёт API: запись по коду
 * ищется запросом к базе, и время не должно расти вместе со списком.
 */
export const externalWrite: Migration = {
  name: '0002-external-write',
  up: async (sequelize, transaction) => {
    const run = (sql: string) => sequelize.query(sql, { transaction });

    await run(`ALTER TABLE infoblock_records ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(255)`);
    await run(
      `CREATE UNIQUE INDEX IF NOT EXISTS infoblock_records_external_id
       ON infoblock_records ("settingsId", "externalId") WHERE "externalId" IS NOT NULL`,
    );

    await run(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "isWritable" BOOLEAN NOT NULL DEFAULT false`);
    await run(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "writeLists" TEXT[]`);

    await run(`CREATE INDEX IF NOT EXISTS infoblock_pages_code ON infoblock_pages (code)`);
    await run(`CREATE INDEX IF NOT EXISTS infoblock_products_code ON infoblock_products (code)`);
    await run(`CREATE INDEX IF NOT EXISTS infoblock_products_categories_code ON infoblock_products_categories (code)`);
    await run(
      `CREATE INDEX IF NOT EXISTS infoblock_contents_items_content_code ON infoblock_contents_items ("contentId", code)`,
    );
  },
};
