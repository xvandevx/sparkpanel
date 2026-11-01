import { formatDateTime } from '../dateFormat';

/** Чистые функции экрана «Настройки → MCP»: адрес, подписи токенов, команды подключения. */

/** Адрес MCP-сервера от корня сайта: он встроен в панель, тот же origin. */
export const MCP_PATH = '/api/mcp';

export const mcpUrl = (origin: string): string => origin + MCP_PATH;

/** Что подставить вместо токена в примерах, пока настоящего нет. */
export const TOKEN_PLACEHOLDER = 'spm_ВАШ_ТОКЕН';

/** Токен в списке: целиком его не знает никто, кроме того, кто его скопировал. */
export const maskedToken = (tokenTail: string): string => `spm_••••••••${tokenTail}`;

export const lastUsedText = (lastUsedAt: string | null): string =>
  lastUsedAt === null ? 'Ни разу' : formatDateTime(lastUsedAt);

const formatDate = (value: Date): string =>
  value.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Срок токена в списке: дата, «Без срока» или «Истёк …». */
export function untilText(expiresAt: string | null, now: Date): { text: string; isExpired: boolean } {
  if (expiresAt === null) return { text: 'Без срока', isExpired: false };
  const until = new Date(expiresAt);
  const isExpired = until <= now;
  return { text: isExpired ? `Истёк ${formatDate(until)}` : formatDate(until), isExpired };
}

/** Срок «без срока» в выборе: у переключателя значение не бывает null. */
const NO_TERM = 0;

/** Сроки, из которых выбирают при создании, — дней; 0 — без срока. */
export const TOKEN_TERMS: { value: number; label: string }[] = [
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
  { value: 365, label: '1 год' },
  { value: NO_TERM, label: 'Без срока' },
];

export const DEFAULT_TERM = 90;

/** Выбранный срок — как его ждёт сервер: дней или null. */
export const termDays = (term: number): number | null => (term === NO_TERM ? null : term);

const DAY_MS = 24 * 60 * 60 * 1000;

const expiryOf = (term: number, now: Date): Date => new Date(now.getTime() + term * DAY_MS);

/** Подсказка под выбором срока: когда токен перестанет работать. */
export const termHint = (term: number, now: Date): string =>
  term === NO_TERM
    ? 'Работает, пока его не отзовут — для постоянной интеграции'
    : `Перестанет работать ${formatDate(expiryOf(term, now))}`;

/** Срок только что созданного токена — строкой под ним. */
export const termText = (term: number, now: Date): string =>
  term === NO_TERM ? 'без срока' : `действует до ${formatDate(expiryOf(term, now))}`;

/** Название токена обязательно: по нему потом решают, какой токен отзывать. */
export const validateTokenName = (name: string): string | null =>
  (name ?? '').trim() === '' ? 'Укажите, где будет стоять токен' : null;

/** Клиенты, для которых экран показывает готовый текст подключения. */
export type McpClient = 'code' | 'desktop' | 'cursor' | 'other';

export const MCP_CLIENTS: { value: McpClient; label: string }[] = [
  { value: 'code', label: 'Claude Code' },
  { value: 'desktop', label: 'Claude Desktop' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'other', label: 'Другой клиент' },
];

/** Команда Claude Code — её же показывает окно «Токен создан» с настоящим токеном. */
export const claudeCodeCommand = (url: string, token: string): string =>
  `claude mcp add --transport http sparkpanel ${url} \\\n  --header "Authorization: Bearer ${token}"`;

/** Где вставить и что именно — для выбранного клиента. */
export function connectionOf(client: McpClient, url: string, token: string): { where: string; snippet: string } {
  switch (client) {
    case 'code':
      return { where: 'Выполните в терминале', snippet: claudeCodeCommand(url, token) };
    case 'desktop':
      return {
        where:
          'Добавьте в claude_desktop_config.json (Настройки → Developer → Edit Config) и перезапустите приложение. ' +
          'Claude Desktop подключается через mcp-remote — нужен Node.js',
        snippet: JSON.stringify(
          {
            mcpServers: {
              sparkpanel: {
                command: 'npx',
                args: ['mcp-remote', url, '--header', `Authorization: Bearer ${token}`],
              },
            },
          },
          null,
          2,
        ),
      };
    case 'cursor':
      return {
        where: 'Добавьте в ~/.cursor/mcp.json',
        snippet: JSON.stringify(
          { mcpServers: { sparkpanel: { url, headers: { Authorization: `Bearer ${token}` } } } },
          null,
          2,
        ),
      };
    case 'other':
      return {
        where: 'Любой клиент MCP с транспортом Streamable HTTP',
        snippet: `Адрес: ${url}\nТранспорт: Streamable HTTP\nЗаголовок: Authorization: Bearer ${token}`,
      };
  }
}

/** Инструменты сервера — для фильтра журнала. Порядок — как в описании сервера. */
export const MCP_TOOL_NAMES = [
  'list_lists',
  'describe_list',
  'find_records',
  'get_record',
  'get_history',
  'save_record',
  'publish_draft',
  'discard_draft',
  'delete_record',
  'upload_file',
];

/** Вид журнала: все вызовы, только изменения или только ошибки. */
export type McpCallsView = 'all' | 'changes' | 'errors';

export const MCP_CALLS_VIEWS: { value: McpCallsView; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'changes', label: 'Изменения' },
  { value: 'errors', label: 'Ошибки' },
];

/** Цвет результата в журнале: ошибка, черновик, удаление черновика — или просто «сделано». */
export function resultTone(call: { result: string; isError: boolean }): 'error' | 'processing' | 'default' | 'success' {
  if (call.isError) return 'error';
  if (call.result === 'Черновик сохранён') return 'processing';
  if (call.result === 'Черновик удалён') return 'default';
  return 'success';
}
