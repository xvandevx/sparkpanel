import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { App } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../redux';
import { saveEditorFiltersThunk } from '../../../redux/action-creaters/contentEditorNew';
import type { EditorProperty } from '../../../redux/reducers/contentEditorNewReducer';
import type { EditorColumns } from '../table';
import { availableColumns } from '../table/columns';
import {
  filterableFields,
  filterEntries,
  filterParamOf,
  filterParamsOf,
  queryWithFilter,
  type ColumnFilter,
  type FilterParams,
} from './columnFilter';

const NO_PROPERTIES: EditorProperty[] = [];
const NO_KEYS: string[] = [];

/**
 * Сколько ждать после правки набора, прежде чем сохранить: поля обычно
 * отмечают несколько подряд, и уходит то, на чём остановились, одним запросом.
 */
const SAVE_DELAY_MS = 400;

/**
 * Фильтр таблицы списка. В нём две разные вещи и два разных места:
 *
 * - **набор полей** — один на список для всех, кто его видит; лежит на
 *   сервере, в сторе — ключи (`filterKeys`, грузит `useLoadEditor`). Правка
 *   видна сразу, на сервер уходит с задержкой;
 * - **что в полях выбрано** — в адресе страницы, у каждого своё. Держим его
 *   и у себя: адрес меняется не мгновенно, а поле ввода должно отзываться
 *   на каждую букву.
 *
 * Зовётся один раз, у корня редактора: кнопка, строка фильтра и таблица
 * получают из него одно и то же.
 */
export function useFilters(listKey: string, columns: EditorColumns) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { message } = App.useApp();

  const properties = useSelector(
    (state: RootState) => state.contentEditorNew[listKey]?.properties ?? NO_PROPERTIES,
  );
  const savedKeys = useSelector(
    (state: RootState) => state.contentEditorNew[listKey]?.filterKeys ?? NO_KEYS,
  );

  /** Поля, по которым можно фильтровать: колонки раздела и свойства записей. */
  const fields = useMemo(
    () => filterableFields(availableColumns(columns, properties)),
    [columns, properties],
  );

  // ——— Набор полей: общий, на сервере

  // Код списка в черновиках нужен потому, что раздел файлов меняет список,
  // не пересоздавая редактор: прежний раздел к новому не прилипает
  const [keysDraft, setKeysDraft] = useState<{ listKey: string; keys: string[] } | null>(null);
  const keys = keysDraft?.listKey === listKey ? keysDraft.keys : savedKeys;

  /** Набор, который ждёт записи. */
  const pending = useRef<{ listKey: string; keys: string[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Записать ждущий набор сейчас, не дожидаясь задержки. */
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (next === null) return;
    dispatch(saveEditorFiltersThunk(next.listKey, next.keys)).then((error) => {
      // Таблица отобрана и так — не сохранился только набор для остальных
      if (error) message.error(error);
    });
  }, [dispatch, message]);

  // Ушли из раздела раньше, чем истекла задержка, — дописываем сразу
  useEffect(() => flush, [flush, listKey]);

  const saveKeys = (next: string[]) => {
    setKeysDraft({ listKey, keys: next });
    pending.current = { listKey, keys: next };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  // ——— Что выбрано: своё, в адресе

  const [paramsDraft, setParamsDraft] = useState<{ listKey: string; params: FilterParams } | null>(
    null,
  );
  // Пока ничего не меняли — выбранное берём из адреса: так открывается ссылка
  const urlParams = useMemo(() => filterParamsOf(router.query), [router.query]);
  const params = paramsDraft?.listKey === listKey ? paramsDraft.params : urlParams;

  const saveParams = (next: FilterParams) => {
    setParamsDraft({ listKey, params: next });
    // Без записи в историю: «назад» должно уводить со страницы, а не по буквам фильтра
    router.replace(
      { pathname: router.pathname, query: queryWithFilter(router.query, next) },
      undefined,
      { shallow: true, scroll: false },
    );
  };

  // ——— Что отдаём кнопке, строке фильтра и таблице

  const entries = useMemo(() => filterEntries(keys, params, fields), [fields, keys, params]);

  /** Поставить поле в фильтр — у всех; выбрать в нём каждый будет своё. */
  const add = (key: string) => saveKeys([...keys, key]);

  /** Убрать поле из фильтра — у всех, а у себя заодно и выбранное в нём. */
  const remove = (key: string) => {
    saveKeys(keys.filter((item) => item !== key));
    if (params[key] !== undefined) {
      const { [key]: _removed, ...rest } = params;
      saveParams(rest);
    }
  };

  return {
    /** Поля, которые можно поставить в фильтр */
    fields,
    /** Ключи полей, стоящих в фильтре, по порядку */
    keys,
    /** Поля фильтра с тем, что в них выбрано */
    entries,
    /** Отметка в меню «Фильтр»: поставить поле или убрать */
    toggle: (key: string) => (keys.includes(key) ? remove(key) : add(key)),
    remove,
    /** Выбор в поле: таблица отберёт сразу, адрес поменяется следом */
    change: (filter: ColumnFilter) => saveParams({ ...params, [filter.key]: filterParamOf(filter) }),
    /** Сбросить выбранное во всех полях; сами поля остаются */
    reset: () => saveParams({}),
  };
}
