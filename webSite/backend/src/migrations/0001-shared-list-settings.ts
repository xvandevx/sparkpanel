import { Migration } from './migration';

/**
 * Контент общий на сайт — и настройки любого списка одни на всех (`userId = 0`,
 * `SITE_OWNER`). Раньше общими были только «общие» списки, остальные каждый
 * заводил себе. Общими становятся самые ранние настройки каждого списка —
 * со свойствами, вкладками, значениями и черновиками: всё это висит на номере
 * настроек, он не меняется. Если у списка уже есть общие, чужие не трогаем:
 * они остаются в базе, но больше не читаются.
 */
export const sharedListSettings: Migration = {
  name: '0001-shared-list-settings',
  up: async (sequelize, transaction) => {
    await sequelize.query(
      `UPDATE infoblock_settings s SET "userId" = 0
       WHERE s."userId" <> 0
         AND s.id = (SELECT min(x.id) FROM infoblock_settings x WHERE x."listKey" = s."listKey")
         AND NOT EXISTS (
           SELECT 1 FROM infoblock_settings o WHERE o."userId" = 0 AND o."listKey" = s."listKey"
         )`,
      { transaction },
    );
  },
};
