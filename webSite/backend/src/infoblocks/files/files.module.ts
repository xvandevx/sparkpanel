import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FileSectionsModule } from './sections/file-sections.module';
import { InfoblockProperty } from '../settings/properties/property.model';
import { InfoblockSettingsModule } from '../settings/settings.module';
import { InfoblockSettings } from '../settings/settings.model';
import { PropertyValue } from '../values/property-values.model';
import { InfoblockRecord } from '../values/record.model';
import { SettingsModule } from '../../settings/settings.module';
import { StoragesModule } from '../storages/storages.module';
import { InfoblockValuesModule } from '../values/values.module';
import { FileLinksService } from './file-links.service';
import { FilesController } from './files.controller';
import { Files } from './files.model';
import { FilesService } from './files.service';

/**
 * Файлы — список редактора контента: загрузка, правка имени и описания,
 * удаление, список с привязками к записям. Разделы, куда файлы кладутся, —
 * `sections/`; хранилище для новых файлов выбирают настройки сайта. Настройки списков, свойства и значения записей здесь только читаются:
 * по ним видно, какая запись выбрала файл.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([
      Files,
      InfoblockSettings,
      InfoblockProperty,
      PropertyValue,
      InfoblockRecord,
    ]),
    FileSectionsModule,
    // Отсюда — названия записей для привязок
    InfoblockSettingsModule,
    SettingsModule,
    // Хранилища — чтобы собрать адрес каждого файла из его ключа
    StoragesModule,
    // Значения свойств самого файла уходят вместе с ним
    InfoblockValuesModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, FileLinksService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [FilesService],
})
export class FilesModule {}
