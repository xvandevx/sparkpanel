import { Migration } from './migration';

/**
 * Индекс по значениям привязок: свойство и запись, на которую оно указывает.
 * Внешнее API отбирает по привязке (`filter[car]=922`) запросом к нему, а не
 * чтением всех значений списка: на 7,5 тыс. товаров чтение шло секундами.
 * У значений других типов `json->>'recordId'` пусто — в поиск они не попадают.
 */
export const linkValuesIndex: Migration = {
  name: '0003-link-values-index',
  up: async (sequelize, transaction) => {
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS infoblock_values_property_link
       ON infoblock_values ("propertyId", (json->>'recordId'))`,
      { transaction },
    );
  },
};
