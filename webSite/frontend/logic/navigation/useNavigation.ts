import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { NAV_SECTIONS, type NavChildrenSource, type NavSection } from '../../config/navigation';
import { useIsRoot } from '../auth';
import { useContentsMenu } from '../contents';

/**
 * Пункт меню в том виде, в каком его рисует левая панель. Подменю бывает двух
 * видов: у «Пользователей» это группа (`isGroup`) — своей страницы у пункта
 * нет, он только раскрывается; у «Контента» пункт и сам ведёт на страницу
 * (все типы), и раскрывается в типы из данных (`childrenSource`).
 */
export interface NavItem {
  key: string;
  label: string;
  icon?: NavSection['icon'];
  children?: NavItem[];
  /** Пункт только раскрывает подменю — перейти по нему некуда */
  isGroup?: boolean;
}

/** Состояние левого меню: какой пункт активен и куда переходить по клику. */
export const useNavigation = () => {
  const router = useRouter();
  const isRoot = useIsRoot();

  const sections = useMemo(() => NAV_SECTIONS, []);

  // Подпункты из данных — по источнику; пусто — пункт без подменю
  const contents = useContentsMenu();
  const sourced = useMemo<Record<NavChildrenSource, NavItem[]>>(
    () => ({ contents }),
    [contents],
  );

  const items = useMemo<NavItem[]>(
    () =>
      NAV_SECTIONS.map((section) => {
        const fromData = section.childrenSource ? sourced[section.childrenSource] : [];
        return {
          key: section.key,
          label: section.label,
          icon: section.icon,
          ...(section.children
            ? {
                isGroup: true,
                children: section.children
                  .filter((child) => isRoot || !child.isRootOnly)
                  .map((child) => ({ key: child.key, label: child.label })),
              }
            : fromData.length > 0
              ? { children: fromData }
              : {}),
        };
      }),
    [isRoot, sourced],
  );

  /**
   * Путь без параметров. Именно `asPath`, а не `pathname`: у страницы раздела
   * `pathname` это шаблон `/admin/infoblocks/[sectionId]`, по нему не понять,
   * какой подпункт подсвечивать.
   */
  const currentPath = useMemo(() => router.asPath.split('?')[0], [router.asPath]);

  /** Все ключи меню, на любой глубине: подменю бывает вложенным. */
  const flatKeys = useMemo(() => collectKeys(items), [items]);

  /** Активен самый длинный подходящий путь: /admin/users не должен подсвечивать /admin. */
  const activeKey = useMemo(() => {
    const matches = flatKeys.filter(
      (key) => currentPath === key || currentPath.startsWith(`${key}/`),
    );
    return matches.sort((a, b) => b.length - a.length)[0] ?? '';
  }, [currentPath, flatKeys]);

  /**
   * Раскрытые подменю: все, внутри которых мы сейчас находимся. Уровней
   * больше одного — внутри записи инфоблока открыты и «Инфоблоки», и его тип.
   */
  const openKeys = useMemo(() => collectOpenKeys(items, currentPath), [currentPath, items]);

  /** Название для шапки: у подпункта — его собственное, иначе название раздела. */
  const currentSection = useMemo(() => findItem(items, activeKey), [activeKey, items]);

  const navigate = useCallback((key: string) => router.push(key), [router]);

  return { sections, items, activeKey, openKeys, currentSection, navigate };
};

/**
 * Куда ведёт раздел: на свою страницу, а у группы её нет — на первый подпункт.
 * Нужно тем, кто ведёт в раздел мимо меню, — карточкам «Главной».
 */
export const sectionPath = (section: NavSection): string =>
  section.children?.[0]?.key ?? section.key;

/** Ключи всех пунктов дерева меню. */
function collectKeys(items: NavItem[]): string[] {
  return items.flatMap((item) => [item.key, ...collectKeys(item.children ?? [])]);
}

/**
 * Пункты с подменю, внутри которых лежит текущий путь. Смотрим и на подпункты:
 * ключ группы — не путь, и «внутри» неё мы, когда открыт один из них.
 */
function collectOpenKeys(items: NavItem[], currentPath: string): string[] {
  const isWithin = (key: string) => currentPath === key || currentPath.startsWith(`${key}/`);
  return items.flatMap((item) => {
    if (!item.children) return [];
    const inside = [item.key, ...collectKeys(item.children)].some(isWithin);
    return inside ? [item.key, ...collectOpenKeys(item.children, currentPath)] : [];
  });
}

/** Пункт дерева по ключу — на любой глубине. */
function findItem(items: NavItem[], key: string): NavItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    const found = findItem(item.children ?? [], key);
    if (found) return found;
  }
  return null;
}
