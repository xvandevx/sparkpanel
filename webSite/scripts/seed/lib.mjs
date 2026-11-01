/**
 * Общие помощники сида: запросы к API панели через nginx (как браузер) и
 * загрузка файлов. Сид ходит только через API — так данные проходят те же
 * проверки и попадают в журнал изменений, как созданные руками.
 */

const BASE = process.env.SEED_API ?? 'http://localhost:3400/api';

let token = process.env.SEED_TOKEN ?? null;

export function setToken(value) {
  token = value;
}

/** Запрос к API; при ошибке бросает исключение с текстом ответа NestJS. */
export async function api(method, route, body) {
  const response = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    const error = new Error(`${method} ${route} → ${response.status}: ${message ?? text}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const get = (route) => api('GET', route);
export const post = (route, body) => api('POST', route, body);
export const patch = (route, body) => api('PATCH', route, body);
export const put = (route, body) => api('PUT', route, body);
export const del = (route) => api('DELETE', route);

/**
 * Загрузка файла в медиатеку: multipart, как из админки.
 * `file` — `{ name, type, data }`, где `data` — Buffer или строка.
 */
export async function upload(sectionId, file, description) {
  const form = new FormData();
  form.append('file', new Blob([file.data], { type: file.type }), file.name);
  form.append('sectionId', String(sectionId));
  if (description) form.append('description', description);

  const response = await fetch(`${BASE}/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`upload ${file.name} → ${response.status}: ${data?.message}`);
  return data;
}

/** Создать, только если такого ещё нет: сид можно запускать повторно без дублей. */
export async function ensure(existing, matches, create) {
  const found = existing.find(matches);
  if (found) return { item: found, created: false };
  return { item: await create(), created: true };
}

export function log(section, message) {
  console.log(`[${section}] ${message}`);
}
