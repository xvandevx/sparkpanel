import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { resolveInfoblock } from '../settings/infoblock-kinds';

/**
 * Копии списка из управления панелью (`isRootOnly`: пользователи, роли) —
 * только у главного администратора, и читать их тоже. В отличие от
 * `ListEditGuard`, чтение здесь не открыто: в копии пользователей лежат
 * хэши паролей, а восстановлением можно было бы вернуть себе снятую роль.
 */
@Injectable()
export class BackupAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const { isRootOnly } = resolveInfoblock(req.params.listKey);
    if (isRootOnly && !req.user.isRoot) {
      throw new ForbiddenException(
        'Копии этого списка — только у главного администратора',
      );
    }
    return true;
  }
}
