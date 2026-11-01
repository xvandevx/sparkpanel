import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { JwtPayload } from './auth.types';

/**
 * Глобальный гард (APP_GUARD в app.module.ts): все маршруты закрыты по умолчанию,
 * публичные помечаются @Public(). После проверки кладёт payload в req.user —
 * именно оттуда сервисы берут userId, НИКОГДА из тела запроса.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Требуется авторизация');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Сессия недействительна или истекла');
    }
    // Токен без признака root выдан до того, как роль стала флагом `isRoot`:
    // по нему главный администратор выглядел бы обычным пользователем — пусть войдёт заново
    if (typeof payload.isRoot !== 'boolean') {
      throw new UnauthorizedException('Сессия устарела — войдите заново');
    }
    request['user'] = payload;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
