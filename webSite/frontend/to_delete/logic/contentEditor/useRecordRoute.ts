import { useCallback } from 'react';
import { useRouter } from 'next/router';

/**
 * Открытая запись живёт в адресе админки: `/admin/pages?id=2`, `/admin/forms?id=form-1`.
 * Механизм общий на все разделы редактора, поэтому лежит здесь, а не в разделе.
 *
 * У новой записи идентификатора ещё нет: пока её создают, адрес чистый,
 * и id появляется только после сохранения.
 */
export const useRecordRoute = () => {
  const router = useRouter();

  // До готовности роутера query пуст: на статической странице он заполняется
  // после гидрации, и читать его раньше — значит закрыть шторку на первом рендере.
  const selectedId =
    router.isReady && typeof router.query.id === 'string' ? router.query.id : null;

  const select = useCallback(
    (id: string | null) => {
      if (!router.isReady) return;
      const current = typeof router.query.id === 'string' ? router.query.id : null;
      if (current === id) return;

      // Остальные параметры адреса остаются на месте: раздел может держать
      // в нём и своё состояние («Инфоблоки» — выбранный инфоблок), и оно
      // не должно слетать от того, что открыли запись.
      const { id: _current, ...rest } = router.query;

      // push, а не replace: «назад» в браузере закрывает шторку — так это и ожидается
      router.push(
        { pathname: router.pathname, query: id ? { ...rest, id } : rest },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  return { selectedId, select };
};
