import {
  EditorFieldType,
  type EditorFieldDef,
  type EditorFieldGroup,
} from '../editorForm';
import { validateSiteName } from './settingsForm';

/**
 * Описание формы раздела «Настройки» для общих компонентов формы:
 * какие поля и как называются. Чистые данные — ни React, ни сети.
 *
 * Домены сайта сюда не входят: их несколько, у каждого своя карточка и своя
 * история, поэтому они живут отдельным списком в редакторе контента
 * (`logic/domains/`).
 */
export const settingsFields = (): EditorFieldDef[] => [
  {
    key: 'siteName',
    label: 'Название сайта',
    type: EditorFieldType.Text,
    placeholder: 'CoPanel',
    note: 'Пойдёт в мету страниц и в письма',
    validate: validateSiteName,
  },
];

export const settingsGroups = (): EditorFieldGroup[] => [
  {
    key: 'site',
    title: 'Сайт',
    fields: ['siteName'],
  },
];
