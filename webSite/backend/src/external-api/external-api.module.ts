import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ContentsModule } from '../infoblocks/contents/contents.module';
import { DomainsModule } from '../infoblocks/domains/domains.module';
import { DraftsModule } from '../infoblocks/drafts/drafts.module';
import { FilesModule } from '../infoblocks/files/files.module';
import { RecordsModule } from '../infoblocks/records/records.module';
import { InfoblockSettingsModule } from '../infoblocks/settings/settings.module';
import { InfoblockValuesModule } from '../infoblocks/values/values.module';
import { SettingsModule } from '../settings/settings.module';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { ApiKeyGuard } from './keys/api-key.guard';
import { ApiKey } from './keys/api-key.model';
import { ApiKeysController } from './keys/api-keys.controller';
import { ApiKeysService } from './keys/api-keys.service';

/**
 * Внешнее API: `/api/v1` для сайта (по ключу) и ключи с документацией для
 * панели (`/api/external-api`). Записи читает у `RecordsService` — поэтому,
 * как и он, модуль никем не импортируется.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([ApiKey]),
    RecordsModule,
    InfoblockSettingsModule,
    InfoblockValuesModule,
    DraftsModule,
    ContentsModule,
    DomainsModule,
    FilesModule,
    SettingsModule,
  ],
  controllers: [ExternalApiController, ApiKeysController],
  providers: [ExternalApiService, ApiKeysService, ApiKeyGuard],
})
export class ExternalApiModule {}
