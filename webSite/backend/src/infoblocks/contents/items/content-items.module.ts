import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../../history/history.module';
import { InfoblockSettings } from '../../settings/settings.model';
import { InfoblockValuesModule } from '../../values/values.module';
import { Contents } from '../contents.model';
import { ContentItemsController } from './content-items.controller';
import { ContentItems } from './content-items.model';
import { ContentItemsService } from './content-items.service';

/**
 * Элементы типов контента — списки редактора `content-items.<номер типа>`:
 * у элементов каждого типа свои свойства. Типы — модуль уровнем выше.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([ContentItems, Contents, InfoblockSettings]),
    HistoryModule,
    // Значения свойств элемента уходят вместе с ним
    InfoblockValuesModule,
  ],
  controllers: [ContentItemsController],
  providers: [ContentItemsService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [ContentItemsService],
})
export class ContentItemsModule {}
