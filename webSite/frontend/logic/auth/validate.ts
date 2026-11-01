/** Чистые правила валидации форм. Без React, без сети, без Ant Design. */

// Переходник к правилам antd общий на все разделы — лежит уровнем выше.
export { asRule } from '../formRules';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Совпадает с @MinLength в LoginDto на бэкенде. */
export const PASSWORD_MIN_LENGTH = 6;
/** Пароль администратора — доступ ко всей панели, требования строже (CreateRootDto). */
export const ROOT_PASSWORD_MIN_LENGTH = 8;

/** Возвращает текст ошибки или null, если значение корректно. */
export const validateEmail = (email: string): string | null => {
  const value = (email ?? '').trim();
  if (!value) return 'Укажите email';
  if (!EMAIL_RE.test(value)) return 'Некорректный формат email';
  return null;
};

export const validatePassword = (
  password: string,
  minLength: number = PASSWORD_MIN_LENGTH,
): string | null => {
  if (!password) return 'Укажите пароль';
  if (password.length < minLength) return `Минимальная длина пароля — ${minLength} символов`;
  return null;
};

export const validatePasswordConfirm = (
  password: string,
  confirm: string,
): string | null => (password === confirm ? null : 'Пароли не совпадают');
