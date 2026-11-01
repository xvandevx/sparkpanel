import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toNumericId } from './infoblockIds';
import { INFOBLOCKS_ROOT, blockPath, sectionPath } from './infoblockRoutes';

/**
 * Где мы находимся в разделе: номер типа и номер инфоблока из адреса
 * страницы, плюс переходы между уровнями.
 *
 * До готовности роутера `query` пуст — на статической странице он заполняется
 * после гидрации, и читать его раньше значило бы показать «тип не найден»
 * на первом же рендере.
 */
export const useInfoblocksRoute = () => {
  const router = useRouter();

  const sectionId = useMemo(
    () => (router.isReady ? toNumericId(router.query.sectionId) : null),
    [router.isReady, router.query.sectionId],
  );

  const blockId = useMemo(
    () => (router.isReady ? toNumericId(router.query.blockId) : null),
    [router.isReady, router.query.blockId],
  );

  const openSection = useCallback(
    (id: number) => router.push(sectionPath(id)),
    [router],
  );

  const openBlock = useCallback(
    (section: number, block: number) => router.push(blockPath(section, block)),
    [router],
  );

  const backToSections = useCallback(() => router.push(INFOBLOCKS_ROOT), [router]);

  const backToSection = useCallback(
    (id: number) => router.push(sectionPath(id)),
    [router],
  );

  /** Роутер ещё не отдал параметры — экран ждёт, а не показывает «не найдено». */
  const isReady = router.isReady;

  return { sectionId, blockId, isReady, openSection, openBlock, backToSections, backToSection };
};
