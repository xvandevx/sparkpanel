import { createContext, useContext, type ReactNode } from 'react';
import type { EditorFormValue } from './types';

/**
 * Мост между состоянием формы и её компонентами: поле получает только свой ключ,
 * всё остальное берёт отсюда — без пробрасывания значений и обработчиков через
 * группы и вкладки.
 */
const EditorFormContext = createContext<EditorFormValue | null>(null);

export function EditorFormProvider({
  value,
  children,
}: {
  value: EditorFormValue;
  children: ReactNode;
}) {
  return <EditorFormContext.Provider value={value}>{children}</EditorFormContext.Provider>;
}

/** Единственная точка доступа компонентов формы к её состоянию. */
export function useEditorForm(): EditorFormValue {
  const value = useContext(EditorFormContext);
  if (!value) {
    throw new Error('useEditorForm вызван вне EditorFormProvider');
  }
  return value;
}
