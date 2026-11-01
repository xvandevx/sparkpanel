import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Users } from '../../users/users.model';
import { InfoblockSettings } from '../settings/settings.model';
import { HistoryController } from './history.controller';
import { History } from './history.model';
import { HistoryService } from './history.service';

/**
 * Журнал изменений — одна сущность на всю панель: в `history` лежат
 * правки всех разделов, и отличаются они только типом записи. Читается журнал
 * одним маршрутом по ключу списка (`GET /api/infoblocks/history/:listKey`), а какому типу
 * записей этот ключ соответствует, знает `infoblocks/settings/infoblock-kinds`.
 */
@Module({
  // Модели Users и настроек списков, а не их модули: оба раздела сами пишут
  // в журнал, и взаимный импорт модулей Nest не соберёт (см. HistoryService).
  // Настройки нужны, чтобы не писать журнал списка, у которого он выключен
  imports: [SequelizeModule.forFeature([History, Users, InfoblockSettings])],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
