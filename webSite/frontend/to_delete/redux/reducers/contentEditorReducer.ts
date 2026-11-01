/**
 * Состояние редактора контента: что открыто, что набрано в форме, что изменено.
 *
 * Лежит в сторе, а не в React-состоянии редактора, чтобы источник был один и
 * видимый: в devtools сразу понятно, какая запись открыта и чем форма отличается
 * от сохранённого. Контроллера раздела здесь нет и быть не может — в нём функции
 * (`save`, `valuesOf`, `options(values)`), он приходит пропсом в `<ContentEditor>`.
 *
 * Редактор на экране один, поэтому срез один: уход на другой раздел размонтирует
 * редактор, и состояние заводится заново (`CONTENT_EDITOR_SESSION_STARTED`).
 */

/** Значения формы: ключ поля → значение. Тот же тип, что `EditorValues` в logic/. */
export type EditorFormValues = Record<string, unknown>;

/** Режим таблицы: список записей или общий журнал изменений раздела. */
export type EditorViewMode = 'list' | 'journal';

/**
 * Отложенное действие: переключение, которое упёрлось в несохранённые правки.
 * Строка таблицы хранится идентификатором, а не объектом: в сторе место
 * сериализуемым данным, а саму запись редактор найдёт по ключу.
 */
export type EditorPendingAction =
  | { type: 'select'; id: string }
  | { type: 'create'; parentId: string | null }
  | { type: 'rowAction'; recordId: string }
  | { type: 'close' };

export const CONTENT_EDITOR_SESSION_STARTED = 'CONTENT_EDITOR_SESSION_STARTED';
export const CONTENT_EDITOR_VIEW_MODE_CHANGED = 'CONTENT_EDITOR_VIEW_MODE_CHANGED';
export const CONTENT_EDITOR_FORM_READ = 'CONTENT_EDITOR_FORM_READ';
export const CONTENT_EDITOR_FIELD_CHANGED = 'CONTENT_EDITOR_FIELD_CHANGED';
export const CONTENT_EDITOR_FORM_RESET = 'CONTENT_EDITOR_FORM_RESET';
export const CONTENT_EDITOR_FORM_COMMITTED = 'CONTENT_EDITOR_FORM_COMMITTED';
export const CONTENT_EDITOR_CREATE_STARTED = 'CONTENT_EDITOR_CREATE_STARTED';
export const CONTENT_EDITOR_CREATE_ENDED = 'CONTENT_EDITOR_CREATE_ENDED';
export const CONTENT_EDITOR_DISCARD_ASKED = 'CONTENT_EDITOR_DISCARD_ASKED';
export const CONTENT_EDITOR_DISCARD_CANCELLED = 'CONTENT_EDITOR_DISCARD_CANCELLED';

export interface ContentEditorState {
  /**
   * Чей это заход в редактор. Срез один на все разделы и переживает уход с экрана,
   * поэтому состояние чужой сессии нельзя ни читать, ни показывать: редактор
   * сверяет ключ на рендере и до совпадения работает с пустым состоянием.
   */
  sessionId: string | null;
  /** Режим таблицы */
  viewMode: EditorViewMode;
  /** Идёт создание записи: идентификатора у неё ещё нет, адрес страницы чистый */
  isCreating: boolean;
  /** Внутри какой записи создаём (у разделов с вложенностью) */
  createParentId: string | null;
  /**
   * Под какую запись прочитана форма: `<id>` или `new:<родитель>`. Пока ключ
   * не меняется, набранное остаётся на месте — обновление соседних данных
   * не затирает открытую форму.
   */
  formKey: string;
  /** Что сейчас в форме */
  values: EditorFormValues;
  /** С чем сравниваем, чтобы понять, есть ли правки */
  initialValues: EditorFormValues;
  /** Переключение, которое ждёт ответа «правки не сохранены»; null — вопроса нет */
  pending: EditorPendingAction | null;
}

/** Пустое состояние: с ним же рисуется кадр, пока срез принадлежит прошлому разделу. */
export const EMPTY_EDITOR_SESSION: ContentEditorState = {
  sessionId: null,
  viewMode: 'list',
  isCreating: false,
  createParentId: null,
  formKey: '',
  values: {},
  initialValues: {},
  pending: null,
};

export type ContentEditorAction =
  | { type: typeof CONTENT_EDITOR_SESSION_STARTED; payload: string }
  | { type: typeof CONTENT_EDITOR_VIEW_MODE_CHANGED; payload: EditorViewMode }
  | {
      type: typeof CONTENT_EDITOR_FORM_READ;
      payload: { formKey: string; values: EditorFormValues };
    }
  | { type: typeof CONTENT_EDITOR_FIELD_CHANGED; payload: EditorFormValues }
  | { type: typeof CONTENT_EDITOR_FORM_RESET }
  | { type: typeof CONTENT_EDITOR_FORM_COMMITTED; payload: EditorFormValues }
  | { type: typeof CONTENT_EDITOR_CREATE_STARTED; payload: string | null }
  | { type: typeof CONTENT_EDITOR_CREATE_ENDED }
  | { type: typeof CONTENT_EDITOR_DISCARD_ASKED; payload: EditorPendingAction }
  | { type: typeof CONTENT_EDITOR_DISCARD_CANCELLED };

export const contentEditorReducer = (
  state = EMPTY_EDITOR_SESSION,
  action: ContentEditorAction,
): ContentEditorState => {
  switch (action.type) {
    // Зашли в раздел: предыдущий редактор уже размонтирован, его состояние не нужно
    case CONTENT_EDITOR_SESSION_STARTED:
      return { ...EMPTY_EDITOR_SESSION, sessionId: action.payload };

    case CONTENT_EDITOR_VIEW_MODE_CHANGED:
      return { ...state, viewMode: action.payload };

    // Открыли другую запись — форма перечитана из неё
    case CONTENT_EDITOR_FORM_READ:
      return {
        ...state,
        formKey: action.payload.formKey,
        values: action.payload.values,
        initialValues: action.payload.values,
      };

    // Значения целиком, а не одно поле: правка поля может менять соседние (каскады)
    case CONTENT_EDITOR_FIELD_CHANGED:
      return { ...state, values: action.payload };

    case CONTENT_EDITOR_FORM_RESET:
      return { ...state, values: state.initialValues };

    /**
     * Сохранилось. Исходными становятся именно отправленные значения, а не то,
     * что лежит в форме сейчас: пока запрос летел, пользователь мог продолжить
     * править — эти правки на сервер не ушли и сохранёнными не считаются.
     */
    case CONTENT_EDITOR_FORM_COMMITTED:
      return { ...state, initialValues: action.payload };

    case CONTENT_EDITOR_CREATE_STARTED:
      return { ...state, isCreating: true, createParentId: action.payload, pending: null };

    case CONTENT_EDITOR_CREATE_ENDED:
      return { ...state, isCreating: false, createParentId: null, pending: null };

    case CONTENT_EDITOR_DISCARD_ASKED:
      return { ...state, pending: action.payload };

    case CONTENT_EDITOR_DISCARD_CANCELLED:
      return { ...state, pending: null };

    default:
      return state;
  }
};
