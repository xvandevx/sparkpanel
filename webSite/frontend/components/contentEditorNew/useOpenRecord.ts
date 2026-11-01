import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadEditorListThunk } from '../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../redux/reducers/contentEditorNewReducer';
import { RECORD_PARAM } from '../../logic/navigation';
import { editorRows, type EditorRow } from './table';
import type { EditorListApi } from './useLoadEditor';

/**
 * Какая запись открыта в карточке. Открытая живёт в адресе страницы
 * (`?id=7`): ссылку на запись можно отправить или открыть в новой вкладке,
 * и карточка откроется сама. У новой записи ключа ещё нет — она в адрес
 * не попадает и живёт только здесь, пока карточка открыта.
 *
 * Запись ищется на странице таблицы, а нет её там — во всём списке: по ссылке
 * приходят и в запись со второй страницы. Весь список тогда догружается.
 * Зовётся один раз, у корня редактора.
 */
export function useOpenRecord(listKey: string, api: EditorListApi) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const entry = useSelector((state: RootState) => state.contentEditorNew[listKey] ?? emptyNewEditorList);
  const [created, setCreated] = useState<EditorRow | null>(null);

  const param = router.query[RECORD_PARAM];
  const openId = typeof param === 'string' && param !== '' ? param : null;

  const found = useMemo(() => {
    if (openId === null) return null;
    const onPage = editorRows(entry.page?.items ?? []).find((row) => row.id === openId);
    return onPage ?? editorRows(entry.items).find((row) => row.id === openId) ?? null;
  }, [openId, entry.page?.items, entry.items]);

  // На странице записи нет, а весь список не грузили — догружаем
  const isListNeeded = openId !== null && found === null && !entry.isLoaded && !entry.isLoading;
  useEffect(() => {
    if (isListNeeded) dispatch(loadEditorListThunk(listKey, api.list));
    // Следим за кодом списка, а не за объектом Api: раздел собирает его на каждый рендер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, listKey, isListNeeded]);

  // Пока открыта одна и та же запись, карточка получает тот же объект:
  // перечитанный после правки список не должен пересобирать её черновик
  const shown = useRef<EditorRow | null>(null);
  if (openId === null) shown.current = null;
  else if (found !== null && shown.current?.id !== openId) shown.current = found;

  /** Сменить запись в адресе; остальное в адресе (фильтр, раздел) не трогаем. */
  const replaceId = useCallback(
    (id: string | null) => {
      const { [RECORD_PARAM]: _, ...rest } = router.query;
      router.replace(
        { pathname: router.pathname, query: id === null ? rest : { ...rest, [RECORD_PARAM]: id } },
        undefined,
        { shallow: true, scroll: false },
      );
    },
    [router],
  );

  /** Новая запись (без ключа) — только здесь, сохранённая — в адрес. */
  const open = useCallback(
    (row: EditorRow) => {
      if (row.id === '') setCreated(row);
      else replaceId(row.id);
    },
    [replaceId],
  );

  const close = useCallback(() => {
    setCreated(null);
    if (openId !== null) replaceId(null);
  }, [openId, replaceId]);

  return { record: created ?? (openId === null ? null : shown.current), open, close };
}
