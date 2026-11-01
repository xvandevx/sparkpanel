import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Снимает глобальный AuthGuard с маршрута (логин, health-check и т.п.). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
