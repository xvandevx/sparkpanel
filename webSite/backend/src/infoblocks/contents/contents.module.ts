import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { InfoblockSettingsModule } from '../settings/settings.module';
import { InfoblockValuesModule } from '../values/values.module';
import { ContentsController } from './contents.controller';
import { Contents } from './contents.model';
import { ContentsService } from './contents.service';
import { ContentItems } from './items/content-items.model';

/**
 * Раздел «Контент»: типы контента — список редактора с ключом `contents`.
 * Элементы типа — вложенный модуль `items/`; здесь они только считаются.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([Contents, ContentItems]),
    HistoryModule,
    // Название и код типа — имя и код списка его элементов; отсюда же предел вложенности
    InfoblockSettingsModule,
    // Значения свойств самого типа уходят вместе с ним
    InfoblockValuesModule,
  ],
  controllers: [ContentsController],
  providers: [ContentsService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [ContentsService],
})
export class ContentsModule {}
