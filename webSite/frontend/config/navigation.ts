import type { ComponentType } from 'react';
import {
  AppstoreOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FolderOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';

/**
 * Откуда подпункты берутся из данных, а не из конфига: перечень — в
 * `logic/navigation/useNavigation.ts`, по источнику на вид данных.
 */
export type NavChildrenSource = 'contents';

/** Подпункт раздела: своя страница, путь которой — ключ выделения в меню. */
export interface NavLink {
  key: string;
  label: string;
  /** Пункт видит только главный администратор — остальным его в меню нет */
  isRootOnly?: boolean;
}

export interface NavSection {
  /**
   * Совпадает с путём страницы — используется как ключ выделения в меню.
   * У раздела с подпунктами своей страницы нет: ключ — имя группы, не путь
   */
  key: string;
  label: string;
  icon: ComponentType;
  /** Подпункты: пункт раздела их только раскрывает */
  children?: NavLink[];
  /**
   * Подпункты из данных: пункт и сам ведёт на свою страницу, и раскрывается
   * в записи — как «Контент» в дерево типов
   */
  childrenSource?: NavChildrenSource;
}

/**
 * Разделы системы в левом меню. Порядок здесь = порядок в интерфейсе.
 *
 * Остальные разделы лежат в `to_delete/` и ждут переезда на новый редактор
 * контента (раздел = Api + описание полей). Пункт в меню появляется обратно
 * вместе с переехавшим разделом — мёртвых ссылок в меню не держим.
 */
export const NAV_SECTIONS: NavSection[] = [
  { key: '/admin', label: 'Главная', icon: DashboardOutlined },
  { key: '/admin/pages', label: 'Страницы', icon: FileTextOutlined },
  // Типы контента («Новости», «Статьи»): пункт ведёт на их список и раскрывается
  // в дерево типов — тем же деревом, что в списке; тип ведёт на свои элементы
  {
    key: '/admin/contents',
    label: 'Контент',
    icon: AppstoreOutlined,
    childrenSource: 'contents',
  },
  // Каталог: категории и товары — два списка, товару категории назначают свойством
  {
    key: 'products',
    label: 'Товары',
    icon: ShoppingOutlined,
    children: [
      { key: '/admin/products/categories', label: 'Категории' },
      { key: '/admin/products', label: 'Товары' },
    ],
  },
  { key: '/admin/files', label: 'Файлы', icon: FolderOutlined },
  // Учётные записи и их роли — два списка, у каждого своя страница
  {
    key: 'users',
    label: 'Пользователи',
    icon: TeamOutlined,
    children: [
      { key: '/admin/users', label: 'Пользователи' },
      { key: '/admin/users/roles', label: 'Роли' },
    ],
  },
  // Настройки — последним пунктом: ими пользуются реже всего. Хранилища и домены —
  // списки со своими карточками, поэтому отдельные страницы, а не вкладки настроек;
  // API (ключи открывают данные сайта) и резервные копии (база целиком) видит
  // только главный администратор
  {
    key: 'settings',
    label: 'Настройки',
    icon: SettingOutlined,
    children: [
      { key: '/admin/settings', label: 'Настройки сайта' },
      { key: '/admin/settings/storages', label: 'Хранилища' },
      { key: '/admin/settings/domains', label: 'Домены' },
      { key: '/admin/settings/api', label: 'API', isRootOnly: true },
      { key: '/admin/settings/mcp', label: 'MCP' },
      { key: '/admin/settings/backups', label: 'Резервные копии', isRootOnly: true },
    ],
  },
];
