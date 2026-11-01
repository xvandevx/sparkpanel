/**
 * Символьный код записей: три флага настроек — одним выбором. По отдельности
 * они бессмысленны (уникальность без обязательности нечего проверять), а тремя
 * галочками занимали пол-окна.
 */

export const CodeMode = {
  None: 'none',
  Optional: 'optional',
  Required: 'required',
  Unique: 'unique',
} as const;

export type CodeModeValue = (typeof CodeMode)[keyof typeof CodeMode];

export interface CodeModeOption {
  value: CodeModeValue;
  label: string;
  description: string;
}

export const CODE_MODE_OPTIONS: CodeModeOption[] = [
  { value: CodeMode.None, label: 'Нет', description: 'У записей нет поля «Код»' },
  {
    value: CodeMode.Optional,
    label: 'Необязательный',
    description: 'Поле есть, но запись сохранится и без кода',
  },
  { value: CodeMode.Required, label: 'Обязательный', description: 'Без кода запись не сохранить' },
  {
    value: CodeMode.Unique,
    label: 'Обязательный и уникальный',
    description: 'Код сверяется с кодами остальных записей списка',
  },
];

/** Три флага настроек — в один выбор. */
export const codeModeOf = (settings: {
  useCode?: boolean;
  codeRequired?: boolean;
  codeUnique?: boolean;
} | null): CodeModeValue => {
  // Код у записей есть, пока его не выключили: списки, сохранённые до появления
  // этой настройки, свой код не теряют
  if (settings?.useCode === false) return CodeMode.None;
  if (settings?.codeRequired !== true) return CodeMode.Optional;
  return settings.codeUnique === true ? CodeMode.Unique : CodeMode.Required;
};

/** Выбор — обратно в три флага: их и ждёт сервер. */
export const codeModeFlags = (
  mode: CodeModeValue,
): { useCode: boolean; codeRequired: boolean; codeUnique: boolean } => ({
  useCode: mode !== CodeMode.None,
  codeRequired: mode === CodeMode.Required || mode === CodeMode.Unique,
  codeUnique: mode === CodeMode.Unique,
});
