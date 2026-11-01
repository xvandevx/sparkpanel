import { createContext, useContext, type ReactNode } from 'react';
import { EditorFormProvider } from '../editorForm';
import {
  useListSettingsForm,
  type ListSettingsFormState,
  type ListSettingsTarget,
} from './useListSettingsForm';

/**
 * Мост между состоянием окна настроек и его частями: шапка с кнопками, имя
 * и код, таблица свойств и строка свойства берут его отсюда — без проброса
 * черновиков и обработчиков через пропсы.
 */
const ListSettingsFormContext = createContext<ListSettingsFormState | null>(null);

export function ListSettingsFormProvider({
  target,
  open,
  children,
}: {
  target: ListSettingsTarget;
  open: boolean;
  children: ReactNode;
}) {
  const state = useListSettingsForm(target, open);
  return (
    <ListSettingsFormContext.Provider value={state}>
      {/* Имя и код рисует общая форма — ей нужен только контекст формы */}
      <EditorFormProvider value={state.form}>{children}</EditorFormProvider>
    </ListSettingsFormContext.Provider>
  );
}

/** Единственная точка доступа частей окна настроек к его состоянию. */
export function useListSettingsFormState(): ListSettingsFormState {
  const value = useContext(ListSettingsFormContext);
  if (!value) {
    throw new Error('useListSettingsFormState вызван вне ListSettingsFormProvider');
  }
  return value;
}
