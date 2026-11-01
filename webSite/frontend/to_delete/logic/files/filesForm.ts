
/** Код раздела: строчные латинские буквы и цифры, между ними дефис или подчёркивание. */
export const SECTION_CODE_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/**
 * Проверки формы раздела. Те же правила, что на бэкенде (`CreateFileSectionDto`):
 * сервер остаётся последней инстанцией, но объяснять опечатку лучше сразу.
 */

export const validateSectionCode = (value: unknown): string | null => {
  const code = String(value ?? '').trim();
  if (!code) return 'Укажите код раздела';
  if (code.length > 120) return 'Код длиннее 120 символов';
  if (!SECTION_CODE_PATTERN.test(code)) {
    return 'Только строчные латинские буквы, цифры, дефис и подчёркивание';
  }
  return null;
};

export const validateSectionName = (value: unknown): string | null => {
  const name = String(value ?? '').trim();
  if (!name) return 'Укажите название раздела';
  if (name.length > 255) return 'Название длиннее 255 символов';
  return null;
};

