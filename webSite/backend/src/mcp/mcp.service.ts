import { HttpException, Injectable, Logger } from '@nestjs/common';
import { McpCallsService } from './calls/mcp-calls.service';
import { isChangeTool, MCP_INSTRUCTIONS, MCP_TOOLS } from './mcp-tools';
import { McpToolsService, type ToolOutcome } from './mcp-tools.service';
import { PanelError } from './panel-client';
import { McpCaller } from './tokens/mcp-tokens.service';

/** Версии протокола, которые сервер понимает; первая — новейшая. */
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: unknown }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string } };

/** Коды ошибок JSON-RPC. */
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

/**
 * Сервер MCP — JSON-RPC поверх одного `POST /api/mcp` (Streamable HTTP без
 * сессий): каждый запрос самодостаточен, токен приходит в каждом. Потоков
 * SSE нет — инструменты отвечают сразу, обычным JSON.
 *
 * Методов немного: рукопожатие, список инструментов и их вызов. Вызов
 * инструмента пишется в журнал MCP, удачный или нет.
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly tools: McpToolsService,
    private readonly calls: McpCallsService,
  ) {}

  /** Ответ на сообщение; у уведомления (без `id`) ответа нет — null. */
  async handle(caller: McpCaller, message: unknown): Promise<JsonRpcResponse | null> {
    const request = message as JsonRpcRequest;
    if (typeof request !== 'object' || request === null || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
      return { jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Не JSON-RPC 2.0' } };
    }
    if (request.id === undefined) return null;
    const id = request.id;
    const params = request.params ?? {};

    switch (request.method) {
      case 'initialize': {
        const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
            capabilities: { tools: {} },
            serverInfo: { name: 'sparkpanel', title: 'SparkPanel', version: '1.0.0' },
            instructions: MCP_INSTRUCTIONS,
          },
        };
      }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
      case 'tools/call': {
        const name = params.name;
        if (typeof name !== 'string' || !MCP_TOOLS.some((tool) => tool.name === name)) {
          return { jsonrpc: '2.0', id, error: { code: INVALID_PARAMS, message: `Нет инструмента ${String(name)}` } };
        }
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        return { jsonrpc: '2.0', id, result: await this.call(caller, name, args) };
      }
      default:
        return { jsonrpc: '2.0', id, error: { code: METHOD_NOT_FOUND, message: `Нет метода ${request.method}` } };
    }
  }

  /**
   * Вызов инструмента. Ошибка раздела — не ошибка протокола: она уходит
   * ассистенту результатом с `isError`, чтобы он прочитал её и поправился.
   */
  private async call(caller: McpCaller, tool: string, args: Record<string, unknown>) {
    let outcome: ToolOutcome;
    let isError = false;
    try {
      outcome = await this.tools.run(caller.user, tool, args);
    } catch (error) {
      isError = true;
      // Ошибка раздела — его код и текст; своя (непонятный аргумент, нет записи) — исключение Nest
      const status = error instanceof PanelError ? error.status : error instanceof HttpException ? error.getStatus() : 500;
      const message = status === 500 ? 'Внутренняя ошибка сервера' : (error as Error).message;
      if (status === 500) this.logger.error(error);
      outcome = { data: null, what: whatOf(args), detail: message, result: `Ошибка ${status}` };
    }

    await this.calls.add({
      userId: caller.user.id,
      tokenId: caller.tokenId,
      tool,
      isChange: isChangeTool(tool),
      isError,
      details: {
        tokenName: caller.tokenName,
        userEmail: caller.user.email,
        what: outcome.what,
        detail: outcome.detail,
        result: outcome.result,
        args: loggedArgs(args),
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: isError ? `${outcome.result}: ${outcome.detail}` : JSON.stringify(outcome.data, null, 2),
        },
      ],
      isError,
    };
  }
}

/** Что затронул упавший вызов — из аргументов: результата у него нет. */
const whatOf = (args: Record<string, unknown>): string =>
  [typeof args.list === 'string' ? args.list : '', args.id !== undefined ? `#${String(args.id)}` : '']
    .filter(Boolean)
    .join(' · ');

/** Аргументы для журнала: содержимое файла — только размером. */
const loggedArgs = (args: Record<string, unknown>): Record<string, unknown> =>
  typeof args.contentBase64 === 'string'
    ? { ...args, contentBase64: `${args.contentBase64.length} символов base64` }
    : args;
