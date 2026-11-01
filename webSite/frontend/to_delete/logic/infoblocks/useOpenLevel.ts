import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { findBlock, findSection } from './infoblockIds';
import { useInfoblocksRoute } from './useInfoblocksRoute';
import { useLoadInfoblocksStructure } from './useLoadInfoblocks';

/**
 * Открытый тип: он сам плюс признаки «ещё грузится» и «такого нет».
 * По ним страница решает, показывать список инфоблоков, индикатор или отказ.
 */
export const useOpenSection = () => {
  const sections = useSelector((state: RootState) => state.infoblocks.sections);
  const { loaded } = useSelector((state: RootState) => state.infoblocks);
  const { sectionId, isReady, backToSections } = useInfoblocksRoute();
  const { isLoading, loadFailed, error } = useLoadInfoblocksStructure();

  const section = useMemo(() => findSection(sections, sectionId), [sections, sectionId]);

  return {
    section,
    // Пока роутер не отдал номер и структура не приехала, судить не о чем
    isLoading: !isReady || isLoading || (!loaded && !loadFailed),
    loadFailed,
    error,
    /** Структура загружена, а типа в ней нет — его удалили или адрес неверный */
    isMissing: loaded && isReady && section === null,
    backToSections,
  };
};

/**
 * Открытый инфоблок: он сам, его тип и те же признаки готовности.
 */
export const useOpenBlock = () => {
  const sections = useSelector((state: RootState) => state.infoblocks.sections);
  const { loaded } = useSelector((state: RootState) => state.infoblocks);
  const { sectionId, blockId, isReady, backToSections, backToSection } = useInfoblocksRoute();
  const { isLoading, loadFailed, error } = useLoadInfoblocksStructure();

  const section = useMemo(() => findSection(sections, sectionId), [sections, sectionId]);
  const block = useMemo(() => findBlock(sections, blockId), [sections, blockId]);

  return {
    section,
    block,
    isLoading: !isReady || isLoading || (!loaded && !loadFailed),
    loadFailed,
    error,
    isMissing: loaded && isReady && block === null,
    backToSections,
    backToSection: () => (sectionId === null ? backToSections() : backToSection(sectionId)),
  };
};
