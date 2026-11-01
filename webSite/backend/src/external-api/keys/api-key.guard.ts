import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from './api-keys.service';

/** Заголовок с ключом. Express отдаёт заголовки в нижнем регистре. */
export const API_KEY_HEADER = 'X-Api-Key';

/**
 * Гард внешнего API: вместо JWT — ключ из заголовка `X-Api-Key`. Маршруты
 * внешнего API помечены `@Public()`, чтобы глобальный JWT-гард их пропустил,
 * а этот гард пускает только с действующим ключом и кладёт его владельца
 * в `req.apiKey`.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly keys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.header(API_KEY_HEADER);
    const owner = key ? await this.keys.ownerOf(key.trim()) : null;
    if (!owner) throw new UnauthorizedException('Нет ключа API или он отозван');
    request.apiKey = owner;
    return true;
  }
}
