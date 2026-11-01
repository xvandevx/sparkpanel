/**
 * Ключи списков для настроек. Тот же перечень видов держит бэкенд
 * (`list-settings/list-kinds.ts`): незнакомый ключ он не примет.
 *
 * Вложенный список — с номером владельца через точку: у записей «Новостей»
 * и «Товаров» свои свойства.
 */
export const ListKey = {
  pages: 'pages',
  users: 'users',
  /** Роли пользователей: их назначают системным свойством «Роль» у пользователя */
  roles: 'roles',
  /** Домены сайта — дерево «домен → поддомены» в «Настройки» → «Домены» */
  domains: 'domains',
  infoblockSections: 'infoblock-sections',
  /** Инфоблоки одного типа */
  infoblocks: (sectionId: number) => `infoblocks.${sectionId}`,
  /** Записи одного инфоблока */
  infoblockElements: (blockId: number) => `infoblock-elements.${blockId}`,
  /** Типы контента — корень раздела «Контент» */
  contents: 'contents',
  /** Элементы одного типа контента: у элементов каждого типа свои свойства */
  contentItems: (contentId: number) => `content-items.${contentId}`,
  /** Разделы файлов: дерево в разделе «Файлы» */
  fileSections: 'file-sections',
  /** Файлы одного раздела: у файлов каждого раздела свои свойства, как у записей инфоблока */
  files: (sectionId: number) => `files.${sectionId}`,
  /** Файлы, загруженные через свойство «Файл»/«Изображение»: раздела под них нет */
  propertyFiles: (propertyId: number) => `property-files.${propertyId}`,
  /** Внешние хранилища файлов — в настройках сайта */
  storages: 'storages',
  /** Товары: категории им назначают системным свойством «Категории» */
  products: 'products',
  /** Категории товаров — дерево в разделе «Товары» */
  productCategories: 'product-categories',
} as const;
