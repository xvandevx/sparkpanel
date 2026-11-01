import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { blockPath, sectionPath } from './infoblockRoutes';
import { useLoadInfoblocksStructure } from './useLoadInfoblocks';

/** Пункт подменю: страница уровня и вложенные в неё пункты. */
export interface InfoblockNavItem {
  key: string;
  label: string;
  children?: InfoblockNavItem[];
}

/**
 * Типы инфоблоков и сами инфоблоки для подменю слева — тем же деревом, что
 * и страницы: тип разворачивается в свои списки, клик по списку открывает
 * его записи.
 *
 * Меню видно на любой странице админки, поэтому структура здесь и грузится —
 * один раз на сессию.
 */
export const useInfoblocksNav = (): InfoblockNavItem[] => {
  useLoadInfoblocksStructure();
  const sections = useSelector((state: RootState) => state.infoblocks.sections);

  return useMemo(
    () =>
      sections.map((section) => {
        const blocks = (section.blocks ?? []).map((block) => ({
          key: blockPath(section.id, block.id),
          label: block.name,
        }));

        return {
          key: sectionPath(section.id),
          label: section.name,
          // Пустое подменю antd рисует как раскрывающийся пункт без содержимого
          ...(blocks.length > 0 ? { children: blocks } : {}),
        };
      }),
    [sections],
  );
};
