import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Files } from '../files/files.model';
import { Settings } from '../../settings/settings.model';
import { InfoblockValuesModule } from '../values/values.module';
import { StoragesController } from './storages.controller';
import { Storages } from './storages.model';
import { StoragesService } from './storages.service';

/**
 * Внешние хранилища файлов — список редактора контента, как страницы и разделы
 * файлов. Показывается в настройках сайта, поэтому сервис отдаётся наружу:
 * настройки по нему проверяют выбор, файлы — находят хранилище.
 *
 * Файлы и настройки здесь только читаются: занятое хранилище не удаляется.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([Storages, Files, Settings]),
    // Подключение — значения свойств списка: читается и проверяется там
    InfoblockValuesModule,
  ],
  controllers: [StoragesController],
  providers: [StoragesService],
  exports: [StoragesService],
})
export class StoragesModule {}
