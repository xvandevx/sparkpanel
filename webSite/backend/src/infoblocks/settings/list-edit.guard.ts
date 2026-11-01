import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { resolveInfoblock } from './infoblock-kinds';

/** Чтение списка правом не ограничено: записи пользователей и ролей видят все. */
const READ_METHODS = ['GET', 'HEAD'];

/**
 * Правка списка из управления панелью (`isRootOnly`: пользователи, роли) —
 * его настроек, вкладок, свойств и значений записей — только у главного
 * администратора. Иначе любой пользователь назначил бы себе роль, поправив
 * значение свойства.
 *
 * Гард на весь контроллер, а не проверка в сервисах: правило одно на четыре
 * контроллера, а роль есть только в JWT — тащить её параметром через сервисы
 * незачем. Новый маршрут правки он закроет сам.
 */
@Injectable()
export class ListEditGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (READ_METHODS.includes(req.method)) return true;

    const { isRootOnly } = resolveInfoblock(req.params.listKey);
    if (isRootOnly && !req.user.isRoot) {
      throw new ForbiddenException('Этот список правит только главный администратор');
    }
    return true;
  }
}
