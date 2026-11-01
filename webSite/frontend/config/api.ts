/**
 * Фронт и API живут за одним origin (nginx: / -> Next, /api -> NestJS),
 * поэтому по умолчанию ходим ОТНОСИТЕЛЬНЫМИ путями — без CORS и без хардкода хоста.
 *
 * NEXT_PUBLIC_API_HOST нужен только как escape hatch (например, если фронт
 * поднят отдельно от API). Пустая строка = «тот же origin».
 * ВАЖНО: в браузер попадают только переменные с префиксом NEXT_PUBLIC_.
 */
export const API_HOST = process.env.NEXT_PUBLIC_API_HOST ?? '';

/** Вход через Google — редирект на бэкенд, он сам уводит на Google OAuth. */
export const GOOGLE_SIGN_IN_URL = `${API_HOST}/api/auth/google`;
