import Cookies from 'js-cookie';

const TOKEN_COOKIE = 'access_token';

/**
 * JWT храним в cookie, а не в localStorage: cookie доступна и SSR-коду Next,
 * когда до него дойдёт дело (серверная защита страниц админки).
 * SameSite=Lax достаточно — фронт и API на одном origin через nginx.
 */
export const getAuthToken = (): string | undefined => Cookies.get(TOKEN_COOKIE);

export const setAuthToken = (token: string): void => {
  Cookies.set(TOKEN_COOKIE, token, { sameSite: 'lax', expires: 7 });
};

export const clearAuthToken = (): void => {
  Cookies.remove(TOKEN_COOKIE);
};
