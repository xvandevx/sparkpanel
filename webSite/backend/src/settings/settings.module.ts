import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StoragesModule } from '../infoblocks/storages/storages.module';
import { SettingsController } from './settings.controller';
import { Settings } from './settings.model';
import { SettingsService } from './settings.service';

/**
 * Настройки сайта — строкой на настройку, общие на весь сайт. Отдаёт
 * `SettingsService` файлам: по нему они решают, куда класть новый файл
 * и откуда его удалять. Сами хранилища — список `infoblocks/storages`.
 */
@Module({
  imports: [SequelizeModule.forFeature([Settings]), StoragesModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
