import { useEffect, useState } from 'react';
import { App } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { DraftBody } from '../../../api/drafts';
import type { AppDispatch, RootState } from '../../../redux';
import {
  discardEditorDraftThunk,
  loadEditorRecordDraftThunk,
  publishEditorDraftsThunk,
  saveEditorDraftThunk,
  type EditorPublication,
} from '../../../redux/action-creaters/contentEditorNew';
import type { EditorDraft } from '../../../redux/reducers/contentEditorNewReducer';
import type { EditorRow } from '../table/ContentEditorTable';
import type { EditorListApi } from '../useLoadEditor';

const NO_DRAFTS: Record<string, EditorDraft | null> = {};

/**
 * Черновики списка: включены ли, какие есть и что с ними делают. Берут отсюда
 * и карточка, и таблица (значок в строке, быстрое действие) — друг другу
 * они их не передают.
 *
 * Публикация — то же сохранение, что и без черновика: поля маршрутом раздела
 * (Api раздела), свойства — значениями, а потом черновик снимается.
 */
export function useDrafts(listKey: string, api: EditorListApi) {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();
  const entry = useSelector((state: RootState) => state.contentEditorNew[listKey]);

  const isDraftEnabled = entry?.settings?.isDraftEnabled === true;
  const drafts = entry?.drafts ?? NO_DRAFTS;
  const draftsCount = entry?.draftsCount ?? 0;
  const [isBusy, setIsBusy] = useState(false);

  /** Сохранить черновик записи; true — сохранён. */
  const save = async (recordId: string, body: DraftBody): Promise<boolean> => {
    setIsBusy(true);
    const error = await dispatch(saveEditorDraftThunk(listKey, api.list, recordId, body));
    setIsBusy(false);
    if (error) {
      message.error(error);
      return false;
    }
    message.success('Черновик сохранён');
    return true;
  };

  /** Удалить черновик — спрашиваем: набранное в нём пропадёт. */
  const discard = (recordId: string): Promise<boolean> =>
    new Promise((resolve) => {
      modal.confirm({
        title: 'Удалить черновик?',
        content: 'Запись вернётся к опубликованному, правки черновика пропадут.',
        okText: 'Удалить',
        okButtonProps: { danger: true },
        cancelText: 'Отмена',
        onCancel: () => resolve(false),
        onOk: async () => {
          setIsBusy(true);
          const error = await dispatch(discardEditorDraftThunk(listKey, api.list, recordId));
          setIsBusy(false);
          if (error) message.error(error);
          else message.success('Черновик удалён');
          resolve(error === null);
        },
      });
    });

  /** Опубликовать — спрашиваем: правки сразу станут видны на сайте. */
  const publish = (items: EditorPublication[]): Promise<boolean> =>
    new Promise((resolve) => {
      if (items.length === 0) {
        resolve(false);
        return;
      }
      modal.confirm({
        title: items.length === 1 ? 'Опубликовать?' : `Опубликовать черновики: ${items.length}?`,
        content: 'Правки сразу станут видны на сайте.',
        okText: 'Опубликовать',
        cancelText: 'Отмена',
        onCancel: () => resolve(false),
        onOk: async () => {
          setIsBusy(true);
          const result = await dispatch(publishEditorDraftsThunk(listKey, api.list, items));
          setIsBusy(false);
          if (result.done > 0) message.success(items.length === 1 ? 'Опубликовано' : `Опубликовано: ${result.done}`);
          if (result.errors.length > 0) {
            // Причины у записей обычно одни и те же — показываем первую и сколько всего
            const [first] = result.errors;
            message.error(result.errors.length > 1 ? `${first} (и ещё ${result.errors.length - 1})` : first);
          }
          resolve(result.done > 0);
        },
      });
    });

  /**
   * Опубликовать черновики строк таблицы как есть: поля черновика — правкой
   * раздела (она частичная), свойства — значениями. Строки без черновика пропускаем.
   */
  const publishRows = (rows: EditorRow[]): Promise<boolean> => {
    const update = api.update;
    const items = rows.flatMap((row): EditorPublication[] => {
      const draft = drafts[row.id];
      if (!draft) return [];
      const isFieldsChanged = Object.keys(draft.fields).length > 0;
      return [
        {
          recordId: row.id,
          update: isFieldsChanged && update ? () => update(row.id, draft.fields) : null,
          values: draft.values,
        },
      ];
    });
    if (items.length === 0) {
      message.info('У отмеченных записей нет черновиков');
      return Promise.resolve(false);
    }
    return publish(items);
  };

  return { isDraftEnabled, drafts, draftsCount, isBusy, save, discard, publish, publishRows };
}

/**
 * Пришёл ли черновик открытой записи. Записям страницы таблицы он приходит
 * с ней; запись не со страницы (открыта из журнала) — догружаем.
 * `recordId` null — черновик не нужен: новая запись или черновики выключены.
 */
export function useRecordDraft(listKey: string, recordId: string | null): boolean {
  const dispatch = useDispatch<AppDispatch>();
  const isKnown = useSelector(
    (state: RootState) => recordId === null || recordId in (state.contentEditorNew[listKey]?.drafts ?? NO_DRAFTS),
  );

  useEffect(() => {
    if (recordId !== null && !isKnown) dispatch(loadEditorRecordDraftThunk(listKey, recordId));
  }, [dispatch, isKnown, listKey, recordId]);

  return isKnown;
}
