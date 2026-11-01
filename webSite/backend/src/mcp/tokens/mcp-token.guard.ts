import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpTokensService } from './mcp-tokens.service';

/**
 * Гард протокола MCP: вместо JWT панели — личный токен `spm_…` в том же
 * заголовке `Authorization: Bearer`. Маршрут помечен `@Public()`, чтобы
 * глобальный JWT-гард его пропустил; владельца токена гард кладёт
 * в `req.mcp`, оттуда инструменты берут, от чьего имени работать.
 */
@Injectable()
export class McpTokenGuard implements CanActivate {
  constructor(private readonly tokens: McpTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    const caller = type === 'Bearer' && token ? await this.tokens.callerOf(token.trim()) : null;
    if (!caller) {
      // Клиенты MCP по 401 смотрят этот заголовок: без него некоторые ждут OAuth
      context.switchToHttp().getResponse<Response>().setHeader('WWW-Authenticate', 'Bearer realm="SparkPanel MCP"');
      throw new UnauthorizedException('Нет токена MCP, он отозван или истёк');
    }
    request.mcp = caller;
    return true;
  }
}
