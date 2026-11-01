import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  askDiscard,
  cancelDiscard,
  changeFormValues,
  changeViewMode,
  commitForm,
  endCreate,
  readForm,
  resetForm,
  startCreate,
  startEditorSession,
} from '../../redux/action-creaters/contentEditor';
import type {
  EditorFormValues,
  EditorPendingAction,
  EditorViewMode,
} from '../../redux/reducers/contentEditorReducer';

/**
 * Действия редактора контента: только dispatch, без селекторов — набор стабильных
 * колбэков, который можно звать откуда угодно, не вызывая лишних перерисовок.
 */
export const useEditorActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  return useMemo(
    () => ({
      /** Зашли в раздел: состояние предыдущего редактора не наследуется */
      startSession: (sessionId: string) => dispatch(startEditorSession(sessionId)),
      setViewMode: (viewMode: EditorViewMode) => dispatch(changeViewMode(viewMode)),
      readForm: (formKey: string, values: EditorFormValues) =>
        dispatch(readForm(formKey, values)),
      changeValues: (values: EditorFormValues) => dispatch(changeFormValues(values)),
      resetForm: () => dispatch(resetForm()),
      commitForm: (values: EditorFormValues) => dispatch(commitForm(values)),
      startCreate: (parentId: string | null) => dispatch(startCreate(parentId)),
      endCreate: () => dispatch(endCreate()),
      askDiscard: (action: EditorPendingAction) => dispatch(askDiscard(action)),
      cancelDiscard: () => dispatch(cancelDiscard()),
    }),
    [dispatch],
  );
};
