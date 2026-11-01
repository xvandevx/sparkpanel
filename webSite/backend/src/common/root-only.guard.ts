import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Маршруты только для главного администратора — и на чтение тоже: копии сайта
 * (в них хэши паролей и ключи хранилищ) и ключи внешнего API. Признак берётся
 * из JWT, как и `userId`.
 */
@Injectable()
export class RootOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user.isRoot) {
      throw new ForbiddenException('Только у главного администратора');
    }
    return true;
  }
}
