/**
 * MCP: ИИ-ассистенты работают с панелью без браузера. Здесь — личные токены,
 * журнал вызовов и тексты подключения для экрана «Настройки → MCP»
 * (`components/settings/mcp/`).
 */
export { useMcpAddress } from './useMcpAddress';
export { useMcpTokens } from './useMcpTokens';
export { useMcpCalls, type McpCallsFilter } from './useMcpCalls';
export {
  claudeCodeCommand,
  connectionOf,
  DEFAULT_TERM,
  lastUsedText,
  maskedToken,
  MCP_CALLS_VIEWS,
  MCP_CLIENTS,
  MCP_TOOL_NAMES,
  resultTone,
  termDays,
  termHint,
  termText,
  TOKEN_PLACEHOLDER,
  TOKEN_TERMS,
  untilText,
  validateTokenName,
  type McpCallsView,
  type McpClient,
} from './mcpFormat';
export type { McpCall, McpToken } from '../../redux/action-creaters/mcp';
