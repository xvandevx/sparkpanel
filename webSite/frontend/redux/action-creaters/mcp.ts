import { createMcpToken, fetchMcpCalls, fetchMcpTokens, removeMcpToken, type McpCallsQuery } from '../../api/mcp';
import type { McpCallDto, McpTokenDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';

/** Токен MCP в списке: самого токена нет — его не хранит и сервер. */
export interface McpToken {
  id: number;
  name: string;
  /** Последние символы токена */
  tokenTail: string;
  userId: number;
  /** null — пользователя уже нет */
  userEmail: string | null;
  /** null — без срока */
  expiresAt: string | null;
  /** null — вызовов ещё не было */
  lastUsedAt: string | null;
  createdAt: string;
}

/** Вызов инструмента в журнале. */
export interface McpCall {
  id: number;
  createdAt: string;
  tokenId: number;
  tokenName: string;
  userEmail: string;
  tool: string;
  what: string;
  detail: string;
  result: string;
  isChange: boolean;
  isError: boolean;
}

const toToken = (dto: McpTokenDto): McpToken => ({
  ...dto,
  userEmail: dto.userEmail ?? null,
  expiresAt: dto.expiresAt ?? null,
  lastUsedAt: dto.lastUsedAt ?? null,
});

const toCall = (dto: McpCallDto): McpCall => ({
  id: dto.id,
  createdAt: dto.createdAt,
  tokenId: dto.tokenId,
  tokenName: dto.tokenName,
  userEmail: dto.userEmail,
  tool: dto.tool,
  what: dto.what,
  detail: dto.detail,
  result: dto.result,
  isChange: dto.isChange,
  isError: dto.isError,
});

/**
 * Токены и журнал в стор не кладутся: их видит один экран и читает при
 * каждом показе, как ключи внешнего API. Ошибку бросают текстом.
 */
const mcpCall = async <T>(run: () => Promise<T>, failure: string): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw new Error(apiErrorMessage(error, failure));
  }
};

export const loadMcpTokensThunk = () => async (): Promise<McpToken[]> =>
  mcpCall(async () => (await fetchMcpTokens()).map(toToken), 'Не удалось загрузить токены');

/** Новый токен: в ответе он целиком — показать его можно только сейчас. */
export const createMcpTokenThunk =
  (name: string, days: number | null) => async (): Promise<{ token: McpToken; secret: string }> =>
    mcpCall(async () => {
      const created = await createMcpToken(name, days);
      return { token: toToken(created), secret: created.token };
    }, 'Не удалось создать токен');

export const removeMcpTokenThunk = (id: number) => async (): Promise<void> =>
  mcpCall(() => removeMcpToken(id), 'Не удалось отозвать токен');

export const loadMcpCallsThunk =
  (query: McpCallsQuery) => async (): Promise<{ items: McpCall[]; total: number }> =>
    mcpCall(async () => {
      const page = await fetchMcpCalls(query);
      return { items: page.items.map(toCall), total: page.total };
    }, 'Не удалось загрузить журнал');
