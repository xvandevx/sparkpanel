import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toNumericId } from './fileValues';
import { FILES_ROOT, sectionPath } from './filesRoutes';

/**
 * Где мы находимся в разделе: номер открытого раздела медиатеки из адреса
 * страницы плюс переходы между уровнями.
 *
 * До готовности роутера `query` пуст — на статической странице он заполняется
 * после гидрации, и читать его раньше значило бы показать «раздела нет»
 * на первом же рендере.
 */
export const useFilesRoute = () => {
  const router = useRouter();

  const sectionId = useMemo(
    () => (router.isReady ? toNumericId(router.query.sectionId) : null),
    [router.isReady, router.query.sectionId],
  );

  const openSection = useCallback((id: number) => router.push(sectionPath(id)), [router]);

  const backToSections = useCallback(() => router.push(FILES_ROOT), [router]);

  return { sectionId, isReady: router.isReady, openSection, backToSections };
};
