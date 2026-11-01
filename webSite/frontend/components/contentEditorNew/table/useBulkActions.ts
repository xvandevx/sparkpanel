import { useMemo } from 'react';
import { App } from 'antd';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../redux';
import { runEditorBatchThunk } from '../../../redux/action-creaters/contentEditorNew';
import type { EditorFields } from '../drawer';
import { useDrafts } from '../drafts/useDrafts';
import type { EditorListApi } from '../useLoadEditor';
import type { EditorRow } from './ContentEditorTable';

/**
 * Быстрые действия над записями, отмеченными в таблице: опубликовать черновики,
 * удалить, включить, выключить. Какие есть — решает Api раздела, как и везде в редакторе:
 * нет `remove` — нет «Удалить»; нет `update` или поля «Активность»
 * в карточке — нет включения. Раздел их не перечисляет.
 *
 * Правки уходят маршрутами раздела по одной записи (`runEditorBatchThunk`):
 * у каждой свои проверки на сервере и свой след в журнале.
 */

export enum BulkAction {
  Publish = 'publish',
  Activate = 'activate',
  Deactivate = 'deactivate',
  Remove = 'remove',
}

export const BULK_LABELS: Record<BulkAction, string> = {
  [BulkAction.Publish]: 'Опубликовать',
  [BulkAction.Activate]: 'Активировать',
  [BulkAction.Deactivate]: 'Деактивировать',
  [BulkAction.Remove]: 'Удалить',
};

export interface BulkActions {
  /** Что умеет список; пусто — отмечать записи незачем, галочек нет */
  actions: BulkAction[];
  /**
   * Выполнить над отмеченными; `pageRows` — все строки страницы, по ним видно
   * дерево. true — что-то поменялось, выбор можно снять
   */
  run: (action: BulkAction, rows: EditorRow[], pageRows: EditorRow[]) => Promise<boolean>;
}

export function useBulkActions(listKey: string, api: EditorListApi, fields: EditorFields): BulkActions {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();

  // Черновики публикуют те же правки раздела, что и карточка
  const { isDraftEnabled, publishRows } = useDrafts(listKey, api);

  const isPublishable = isDraftEnabled && api.update !== undefined;
  const isToggleable = api.update !== undefined && 'isActive' in fields;
  const isRemovable = api.remove !== undefined;
  const actions = useMemo(
    () => [
      ...(isPublishable ? [BulkAction.Publish] : []),
      ...(isToggleable ? [BulkAction.Activate, BulkAction.Deactivate] : []),
      ...(isRemovable ? [BulkAction.Remove] : []),
    ],
    [isPublishable, isRemovable, isToggleable],
  );

  /** Пачка правок и итог сообщением: сколько прошло, почему не прошли остальные. */
  const batch = async (tasks: (() => Promise<unknown>)[], done: string, failure: string) => {
    const result = await dispatch(runEditorBatchThunk(listKey, api.list, tasks, failure));
    if (result.done > 0) message.success(`${done}: ${result.done}`);
    if (result.errors.length > 0) {
      // Причины у записей обычно одни и те же — показываем первую и сколько всего
      const [first] = result.errors;
      message.error(result.errors.length > 1 ? `${first} (и ещё ${result.errors.length - 1})` : first);
    }
    return result.done > 0;
  };

  const toggle = (rows: EditorRow[], isActive: boolean) => {
    const update = api.update;
    // Уже включённые не трогаем: лишняя правка — лишняя строка в журнале
    const changed = rows.filter((row) => (row.isActive !== false) !== isActive);
    if (!update || changed.length === 0) return Promise.resolve(false);
    return batch(
      changed.map((row) => () => update(row.id, { isActive })),
      isActive ? 'Активировано' : 'Деактивировано',
      'Не удалось изменить запись',
    );
  };

  const remove = (rows: EditorRow[], pageRows: EditorRow[]): Promise<boolean> => {
    const removeOne = api.remove;
    const removable = removableRows(rows, pageRows);
    const blocked = rows.filter((row) => row.isBlocked === true).length;
    if (!removeOne || removable.length === 0) {
      if (blocked > 0) message.warning('Отмеченные записи защищены от удаления');
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      modal.confirm({
        title: `Удалить записи: ${removable.length}?`,
        content: [
          'Вместе с ними пропадут вложенные записи и значения их свойств.',
          blocked > 0 ? `Защищённые от удаления (${blocked}) останутся.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        okText: 'Удалить',
        okButtonProps: { danger: true },
        cancelText: 'Отмена',
        onCancel: () => resolve(false),
        onOk: async () =>
          resolve(await batch(removable.map((row) => () => removeOne(row.id)), 'Удалено', 'Не удалось удалить запись')),
      });
    });
  };

  const run = (action: BulkAction, rows: EditorRow[], pageRows: EditorRow[]) => {
    if (action === BulkAction.Publish) return publishRows(rows);
    if (action === BulkAction.Remove) return remove(rows, pageRows);
    return toggle(rows, action === BulkAction.Activate);
  };

  return { actions, run };
}

/**
 * Что удалять: без защищённых и без тех, чей предок тоже отмечен, — его
 * удаление унесёт их с собой, и отдельный запрос ответил бы «не найдено».
 */
const removableRows = (rows: EditorRow[], pageRows: EditorRow[]): EditorRow[] => {
  const selected = new Set(rows.map((row) => row.id));
  const parentOf = new Map(
    pageRows.map((row) => [row.id, typeof row.parentId === 'string' ? row.parentId : null]),
  );
  // Вверх по дереву страницы — строки приходят целыми ветками; кольцо не зацикливает
  const hasSelectedAncestor = (row: EditorRow): boolean => {
    const seen = new Set([row.id]);
    let parent = parentOf.get(row.id) ?? null;
    while (parent !== null && !seen.has(parent)) {
      if (selected.has(parent)) return true;
      seen.add(parent);
      parent = parentOf.get(parent) ?? null;
    }
    return false;
  };
  return rows.filter((row) => row.isBlocked !== true && !hasSelectedAncestor(row));
};
