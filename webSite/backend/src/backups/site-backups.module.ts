import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InfoblockSettingsModule } from '../infoblocks/settings/settings.module';
import { MigrationsModule } from '../migrations/migrations.module';
import { SiteBackup } from './site-backup.model';
import { SiteBackupsController } from './site-backups.controller';
import { SiteBackupsService } from './site-backups.service';

/**
 * Резервные копии всего сайта (`site_backups`) — база целиком, без файлов.
 * Таблицы читает и пишет запросами по схеме, а не моделями; из настроек
 * списков берёт только сверку системных свойств после восстановления.
 */
@Module({
  imports: [SequelizeModule.forFeature([SiteBackup]), InfoblockSettingsModule, MigrationsModule],
  controllers: [SiteBackupsController],
  providers: [SiteBackupsService],
})
export class SiteBackupsModule {}
