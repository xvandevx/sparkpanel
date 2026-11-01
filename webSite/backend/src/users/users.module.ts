import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../infoblocks/history/history.module';
import { InfoblockColumn } from '../infoblocks/settings/columns/column.model';
import { InfoblockValuesModule } from '../infoblocks/values/values.module';
import { UsersController } from './users.controller';
import { Users } from './users.model';
import { UsersService } from './users.service';

/**
 * Учётные записи панели: и вход в систему (через AuthModule), и раздел «Пользователи».
 *
 * HistoryModule импортируется сюда, а обратной зависимости нет: журналу нужна только
 * модель Users (имя автора), а не этот модуль, — иначе Nest не собрал бы цикл.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([Users, InfoblockColumn]),
    HistoryModule,
    // Удаление учётной записи стирает значения её свойств (роль)
    InfoblockValuesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
