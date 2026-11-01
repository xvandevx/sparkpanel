import {
  api,
  CreatedMcpTokenDto,
  CreateMcpTokenDtoDaysEnum,
  McpCallsPageDto,
  McpPanelControllerFindCallsPageSizeEnum,
  McpPanelControllerFindCallsViewEnum,
  McpTokenDto,
} from '../src/api/client';

/**
 * MCP глазами панели (`/api/mcp/tokens`, `/api/mcp/calls`): личные токены
 * ассистентов и журнал их вызовов. Сам протокол (`POST /api/mcp`) — для
 * ассистентов, панель в него не ходит.
 */

export const fetchMcpTokens = async (): Promise<McpTokenDto[]> => {
  const { data } = await api.mcp.mcpPanelControllerFindTokens();
  return data;
};

/** Ответ — единственный раз, когда токен виден целиком. `days: null` — без срока. */
export const createMcpToken = async (name: string, days: number | null): Promise<CreatedMcpTokenDto> => {
  const { data } = await api.mcp.mcpPanelControllerCreateToken({
    name,
    days: days as unknown as CreateMcpTokenDtoDaysEnum | null,
  });
  return data;
};

export const removeMcpToken = async (id: number): Promise<void> => {
  await api.mcp.mcpPanelControllerRemoveToken(id);
};

export interface McpCallsQuery {
  tokenId?: number;
  tool?: string;
  view: 'all' | 'changes' | 'errors';
  page: number;
  pageSize: number;
}

export const fetchMcpCalls = async (query: McpCallsQuery): Promise<McpCallsPageDto> => {
  const { data } = await api.mcp.mcpPanelControllerFindCalls(
    query.tokenId,
    query.tool,
    query.view as McpPanelControllerFindCallsViewEnum,
    query.page,
    query.pageSize as unknown as McpPanelControllerFindCallsPageSizeEnum,
  );
  return data;
};
