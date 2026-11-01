import { Request } from 'express';
import { HistoryAuthor } from './history.service';

/**
 * Автор правки. id и email берутся из JWT (их положил AuthGuard в req.user),
 * НИКОГДА из тела запроса — иначе журнал можно было бы подписать чужим именем.
 */
export const historyAuthor = (req: Request): HistoryAuthor => {
  const user = (req as Request & { user?: { id: number; email: string; via?: string } }).user;
  return {
    id: user?.id as number,
    email: user?.email as string,
    ip: req.ip ?? null,
    via: user?.via ?? null,
  };
};
