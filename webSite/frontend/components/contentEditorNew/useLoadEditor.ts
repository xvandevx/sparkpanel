import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadEditorColumnsThunk,
  loadEditorFiltersThunk,
  loadEditorPropertiesThunk,
  loadEditorSettingsThunk,
  loadEditorTabsThunk,
} from '../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../redux/reducers/contentEditorNewReducer';

/**
 * Первая загрузка данных редактора — одним местом:
 *
 * - **настройки списка** (`loadEditorSettingsThunk`) — имя, код, правила записей;
 * - **вкладки карточки** (`loadEditorTabsThunk`) — вкладки правятся сразу,
 *   по одной, и после каждой правки список перечитывается отсюда же;
 * - **свойства записей** (`loadEditorPropertiesThunk`) — по ним строится
 *   карточка записи, поэтому они нужны не только окну настроек;
 * - **вид таблицы** (`loadEditorColumnsThunk`) — какие колонки видны и в каком
 *   порядке; у каждого пользователя свой;
 * - **поля фильтра** (`loadEditorFiltersThunk`) — какие поля стоят в фильтре
 *   таблицы; один набор на список для всех. Что в них выбрано — в адресе.
 *
 * Настройки, вкладки и свойства — три отдельные сущности, и каждая приходит
 * своим запросом: в карточке записи нужны свойства, а не имя и код списка.
 *
 * Записей и значений их свойств здесь нет: таблица просит у сервера свою
 * страницу сама (`table/useRecordsPage.ts`), значения записей приходят с ней.
 * Весь список грузит только карточка дерева: ей нужен выбор родителя.
 *
 * Настройки, вкладки и свойства меняются только из своего окна и грузятся один раз.
 */

/**
 * Api раздела: где лежат записи. Больше редактор о данных не знает — загрузку,
 * состояние, перечитывание после правки и ошибки ведёт он сам.
 */
export interface EditorListApi<T = unknown> {
  /**
   * Весь список записей. Таблица его не просит — у неё страница с сервера;
   * он нужен карточке дерева (выбор родителя) и тем, кто показывает список
   * целиком: меню типов контента, выбор хранилища
   */
  list: () => Promise<T[]>;
  /**
   * Завести запись: тело собрано по полям карточки. Нет — список записей
   * не заводит, и кнопки «Добавить» у редактора нет: файлы, например,
   * появляются загрузкой, а не карточкой.
   */
  create?: (payload: Record<string, unknown>) => Promise<unknown>;
  /**
   * Изменить запись по её ключу. Нет — карточка открывается только на просмотр:
   * без «Сохранить», поля закрыты (так пользователей видит не главный администратор)
   */
  update?: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  /**
   * Удалить запись по её ключу. Нет — записи списка не удаляются: ни корзины
   * в строке, ни «Удалить» в карточке (учётные записи только отключают)
   */
  remove?: (id: string) => Promise<unknown>;
}

export function useLoadEditor({ listKey }: { listKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const entry =
    useSelector((state: RootState) => state.contentEditorNew[listKey]) ?? emptyNewEditorList;

  const { settings, isSettingsLoading, columns, filterKeys } = entry;

  /**
   * Что уже запрашивали за этот показ раздела. Упавший запрос гасит свой флаг
   * загрузки, но данных не приносит — без этой отметки эффект увидел бы, что
   * грузить снова некому, и бил бы в недоступный сервер до закрытия вкладки.
   * Повтор — по возвращению в раздел: отметки живут, пока редактор на экране.
   */
  const asked = useRef(new Set<string>());
  const requested = (what: string): boolean => {
    const key = `${listKey}:${what}`;
    if (asked.current.has(key)) return true;
    asked.current.add(key);
    return false;
  };

  useEffect(() => {
    if (settings || isSettingsLoading || requested('settings')) return;
    dispatch(loadEditorSettingsThunk(listKey));
    dispatch(loadEditorTabsThunk(listKey));
    dispatch(loadEditorPropertiesThunk(listKey));
    // `requested` смотрит в ссылку, в зависимостях ему делать нечего
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isSettingsLoading, listKey, settings]);

  // Вид таблицы — своим условием, а не вместе с настройками: пока его нет,
  // таблица ждёт, и зависеть от того, пришли ли настройки, ей нельзя
  useEffect(() => {
    if (columns !== null || requested('columns')) return;
    dispatch(loadEditorColumnsThunk(listKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, dispatch, listKey]);

  // Поля фильтра — так же своим условием: пока их нет, таблица ждёт, иначе
  // весь список мелькнул бы перед отобранным по адресу
  useEffect(() => {
    if (filterKeys !== null || requested('filters')) return;
    dispatch(loadEditorFiltersThunk(listKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filterKeys, listKey]);
}
