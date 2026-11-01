import { useEffect, useMemo, useState } from 'react';
import { App } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../redux';
import {
  loadEditorListThunk,
  loadEditorRecordValuesThunk,
  removeEditorRecordThunk,
  saveEditorRecordThunk,
  saveEditorValuesThunk,
} from '../../../redux/action-creaters/contentEditorNew';
import type { EditorListApi } from '../useLoadEditor';
import { editorRows, type EditorRow } from '../table';

/**
 * Что делают с записью: сохранить и удалить. Действия берут отсюда и шторка,
 * и таблица (корзина в строке) — друг другу они их не передают: запись уходит
 * на сервер по своему ключу, и посредник между ними не нужен.
 *
 * После каждой правки редактор перечитывает список: сервер мог поправить
 * запись по-своему, и в таблице должно лежать сохранённое.
 */
export function useRecord(listKey: string, api: EditorListApi) {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();

  // Флаг свой у каждого, кто пишет: таблице — загрузка строк, шторке — кнопка
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Ключа нет — запись заводят; есть — правят открытую. Возвращает ключ
   * сохранённой записи: под ним пишутся значения её свойств, а у новой записи
   * он появляется только сейчас.
   */
  const save = async (
    id: string | null,
    payload: Record<string, unknown>,
    // Новая запись черновиком — это ещё не «добавлена»: об итоге скажет черновик
    { isQuiet = false }: { isQuiet?: boolean } = {},
  ): Promise<{ isSaved: boolean; key: string | null }> => {
    // Чего Api не умеет, того карточка и не предлагает: новую запись открывает
    // только кнопка «Добавить», а без `update` у карточки нет «Сохранить»
    const write = (): Promise<unknown> => {
      if (id === null) return api.create ? api.create(payload) : refuse('Этот список записи не заводит');
      return api.update ? api.update(id, payload) : refuse('Этот список записи не правит');
    };

    setIsSaving(true);
    const { error, record } = await dispatch(saveEditorRecordThunk(listKey, api.list, write));
    setIsSaving(false);

    if (error) {
      message.error(error);
      return { isSaved: false, key: null };
    }
    if (!isQuiet) message.success(id === null ? 'Запись добавлена' : 'Запись сохранена');

    const saved = record as { id?: unknown } | null;
    const key = id ?? (saved?.id === undefined || saved.id === null ? null : String(saved.id));
    return { isSaved: true, key };
  };

  /**
   * Значения свойств записи — вторым запросом, после самой записи. Не прошли —
   * запись всё равно сохранена, и говорим об этом прямо: иначе пользователь
   * нажмёт «Сохранить» ещё раз и заведёт вторую такую же.
   */
  const saveValues = async (
    recordId: string,
    values: Record<string, unknown>,
  ): Promise<boolean> => {
    setIsSaving(true);
    const error = await dispatch(saveEditorValuesThunk(listKey, recordId, values));
    setIsSaving(false);

    if (error) {
      message.warning(`Запись сохранена, а значения свойств — нет. ${error}`);
      return false;
    }
    return true;
  };

  /** Удаление спрашивают: вернуть запись будет нечем. Ответ ждём — по нему закрывают шторку. */
  const remove = (row: EditorRow): Promise<boolean> =>
    new Promise((resolve) => {
      modal.confirm({
        title: `Удалить запись «${String(row.name ?? '').trim() || row.id}»?`,
        content: 'Вместе с ней пропадут вложенные записи и значения её свойств.',
        okText: 'Удалить',
        cancelText: 'Отмена',
        onCancel: () => resolve(false),
        onOk: async () => {
          setIsSaving(true);
          const error = await dispatch(
            removeEditorRecordThunk(listKey, api.list, () =>
              api.remove ? api.remove(row.id) : refuse('Этот список записи не удаляет'),
            ),
          );
          setIsSaving(false);

          if (error) {
            message.error(error);
            resolve(false);
            return;
          }
          message.success('Запись удалена');
          resolve(true);
        },
      });
    });

  return { isSaving, save, saveValues, remove };
}

/**
 * Записи списка, из которых карточка выбирает родителя и сверяет код.
 * У таблицы только страница, а родителем может стать запись с любой —
 * поэтому карточка дерева догружает весь список, раз на открытие записи.
 * Плоскому списку родитель не нужен: ему хватает того, что уже есть
 * (код всё равно сверит сервер).
 */
export function useCardRows(
  listKey: string,
  api: EditorListApi,
  { isTree, recordId }: { isTree: boolean; recordId: string | null },
): EditorRow[] {
  const dispatch = useDispatch<AppDispatch>();
  const entry = useSelector((state: RootState) => state.contentEditorNew[listKey]);

  useEffect(() => {
    if (!isTree || recordId === null) return;
    dispatch(loadEditorListThunk(listKey, api.list));
    // Следим за кодом списка, а не за объектом Api: раздел собирает его на каждый рендер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isTree, listKey, recordId]);

  const items = entry?.isLoaded ? entry.items : entry?.page?.items;
  return useMemo(() => editorRows(items ?? []), [items]);
}

/**
 * Пришли ли значения свойств открытой записи. Записям страницы таблицы они
 * приходят с ней; запись не со страницы (открыта из журнала) — догружаем.
 * `recordId` null — новой записи значений и не нужно.
 */
export function useRecordValues(listKey: string, recordId: string | null): boolean {
  const dispatch = useDispatch<AppDispatch>();
  const isKnown = useSelector(
    (state: RootState) => recordId === null || recordId in (state.contentEditorNew[listKey]?.values ?? {}),
  );

  useEffect(() => {
    if (recordId !== null && !isKnown) dispatch(loadEditorRecordValuesThunk(listKey, recordId));
  }, [dispatch, isKnown, listKey, recordId]);

  return isKnown;
}

/** Отказ в действии, которого Api списка не умеет. */
const refuse = (text: string): Promise<never> => Promise.reject(new Error(text));

/**
 * Внешний ID записи — со страницы записей в сторе, а не из открытой карточки:
 * карточка держит строку, с которой открылась, и та бывает строкой полного
 * списка раздела, где внешнего ID нет (его отдаёт только страница записей).
 * Нет на странице — пусто: показывать нечего.
 */
export function useExternalId(listKey: string, recordId: string): string {
  const items = useSelector((state: RootState) => state.contentEditorNew[listKey]?.page?.items);
  return useMemo(() => {
    const row = (items ?? []).find((item) => String((item as { id?: unknown }).id) === recordId) as
      | { externalId?: unknown }
      | undefined;
    return typeof row?.externalId === 'string' ? row.externalId : '';
  }, [items, recordId]);
}
