import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useEditorFormState } from '../editorForm';
import type { RootState } from '../../redux';
import { settingsFields, settingsGroups } from './settingsFields';
import { buildSettingsPatch, settingsToValues, type SettingsSaveStatus } from './settingsForm';
import { useSettingsActions } from './useSettingsActions';

export interface SettingsSaveResult {
  status: SettingsSaveStatus;
  /** Текст ошибки: проверка формы или ответ сервера */
  message?: string;
}

/**
 * Состояние раздела «Настройки»: форма поверх общего состояния формы
 * (`logic/editorForm/`) — та же, что в шторке редактора контента, только
 * без таблицы и вкладок.
 */
export const useSettings = () => {
  const { values: settings, saving, loaded, error } = useSelector(
    (state: RootState) => state.settings,
  );
  const { save } = useSettingsActions();

  const fields = useMemo(() => settingsFields(), []);
  const groups = useMemo(() => settingsGroups(), []);

  const { form, values, isChanged, validate, reset, commit } = useEditorFormState({
    fields,
    groups,
    // Ключ меняется ровно один раз — когда настройки загрузились: дальше форму
    // ведёт пользователь, и перечитывать её из стора уже нельзя.
    formKey: loaded ? 'settings' : '',
    read: () => settingsToValues(settings),
  });

  const submit = useCallback(async (): Promise<SettingsSaveResult> => {
    const invalid = validate();
    if (invalid) return { status: 'error', message: invalid };

    const patch = buildSettingsPatch(settings, values);
    // Ничего не поменяли — запрос не шлём: сохранять нечего.
    if (Object.keys(patch).length === 0) return { status: 'unchanged' };

    const saved = await save(patch);
    if (!saved) return { status: 'error', message: error ?? 'Не удалось сохранить настройки' };

    // Форму перечитываем из ответа: сервер нормализовал домен и достроил поддомены
    commit(settingsToValues(saved));
    return { status: 'saved' };
  }, [commit, error, save, settings, validate, values]);

  return {
    /** Описание формы для общих компонентов (EditorFormProvider) */
    form,
    /** Настройки загружены — форму можно рисовать */
    isReady: loaded,
    isChanged,
    isSaving: saving,
    /** Ошибка от сервера (валидация домена, сеть) */
    error,
    reset,
    submit,
  };
};
