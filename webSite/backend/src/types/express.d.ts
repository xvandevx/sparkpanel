import { JwtPayload } from '../auth/auth.types';
import { ApiKeyOwner } from '../external-api/keys/api-keys.service';
import { McpCaller } from '../mcp/tokens/mcp-tokens.service';

/**
 * req.user кладёт AuthGuard после проверки токена. Объявление нужно, чтобы
 * контроллеры читали userId типизированно и не через `any`.
 */
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
      /** Владелец ключа внешнего API — кладёт `ApiKeyGuard` на маршрутах `/api/v1` */
      apiKey?: ApiKeyOwner;
      /** Владелец токена MCP — кладёт `McpTokenGuard` на маршруте `/api/mcp` */
      mcp?: McpCaller;
    }
  }
}

export {};
