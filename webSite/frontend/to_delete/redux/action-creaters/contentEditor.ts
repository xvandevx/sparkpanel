import {
  CONTENT_EDITOR_CREATE_ENDED,
  CONTENT_EDITOR_CREATE_STARTED,
  CONTENT_EDITOR_DISCARD_ASKED,
  CONTENT_EDITOR_DISCARD_CANCELLED,
  CONTENT_EDITOR_FIELD_CHANGED,
  CONTENT_EDITOR_FORM_COMMITTED,
  CONTENT_EDITOR_FORM_READ,
  CONTENT_EDITOR_FORM_RESET,
  CONTENT_EDITOR_SESSION_STARTED,
  CONTENT_EDITOR_VIEW_MODE_CHANGED,
  ContentEditorAction,
  EditorFormValues,
  EditorPendingAction,
  EditorViewMode,
} from '../reducers/contentEditorReducer';

/**
 * Действия редактора контента. Сети здесь нет — сохранение делает раздел
 * своими thunks, редактор только держит состояние экрана.
 */

/**
 * Зашли в раздел: состояние предыдущего редактора не наследуется.
 * `sessionId` — идентификатор этого захода, по нему редактор отличает своё состояние
 * от оставшегося в срезе от прошлого раздела.
 */
export const startEditorSession = (sessionId: string): ContentEditorAction => ({
  type: CONTENT_EDITOR_SESSION_STARTED,
  payload: sessionId,
});

export const changeViewMode = (viewMode: EditorViewMode): ContentEditorAction => ({
  type: CONTENT_EDITOR_VIEW_MODE_CHANGED,
  payload: viewMode,
});

/** Форма перечитана под другую запись. */
export const readForm = (formKey: string, values: EditorFormValues): ContentEditorAction => ({
  type: CONTENT_EDITOR_FORM_READ,
  payload: { formKey, values },
});

/**
 * Новое состояние формы целиком: правка одного поля может менять соседние
 * (каскады `onChange`), поэтому пересчёт делает logic-слой, а сюда приходит результат.
 */
export const changeFormValues = (values: EditorFormValues): ContentEditorAction => ({
  type: CONTENT_EDITOR_FIELD_CHANGED,
  payload: values,
});

/** «Отменить»: вернуть форму к состоянию на момент открытия. */
export const resetForm = (): ContentEditorAction => ({ type: CONTENT_EDITOR_FORM_RESET });

/**
 * Сохранилось: исходными становятся отправленные значения. Их передают явно —
 * пока запрос летел, в форме могли появиться новые правки, и они не сохранены.
 */
export const commitForm = (values: EditorFormValues): ContentEditorAction => ({
  type: CONTENT_EDITOR_FORM_COMMITTED,
  payload: values,
});

export const startCreate = (parentId: string | null): ContentEditorAction => ({
  type: CONTENT_EDITOR_CREATE_STARTED,
  payload: parentId,
});

/** Создание закончилось — сохранением или закрытием шторки. */
export const endCreate = (): ContentEditorAction => ({ type: CONTENT_EDITOR_CREATE_ENDED });

/** Переключение упёрлось в несохранённые правки: ждём ответа пользователя. */
export const askDiscard = (action: EditorPendingAction): ContentEditorAction => ({
  type: CONTENT_EDITOR_DISCARD_ASKED,
  payload: action,
});

/** «Вернуться к правке»: отложенное действие отменяется. */
export const cancelDiscard = (): ContentEditorAction => ({
  type: CONTENT_EDITOR_DISCARD_CANCELLED,
});
