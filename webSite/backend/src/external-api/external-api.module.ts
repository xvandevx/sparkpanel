import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ContentsModule } from '../infoblocks/contents/contents.module';
import { DomainsModule } from '../infoblocks/domains/domains.module';
import { DraftsModule } from '../infoblocks/drafts/drafts.module';
import { FilesModule } from '../infoblocks/files/files.module';
import { RecordsModule } from '../infoblocks/records/records.module';
import { InfoblockSettingsModule } from '../infoblocks/settings/settings.module';
import { InfoblockValuesModule } from '../infoblocks/values/values.module';
import { PanelClient } from '../common/panel-client';
import { SettingsModule } from '../settings/settings.module';
import { Users } from '../users/users.model';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { ApiKeyGuard } from './keys/api-key.guard';
import { ApiKey } from './keys/api-key.model';
import { ApiKeysController } from './keys/api-keys.controller';
import { ApiKeysService } from './keys/api-keys.service';
import { ExternalWriteService } from './write/external-write.service';
import { RecordLookupService } from './write/record-lookup.service';

/**
 * Внешнее API: `/api/v1` для сайта и интеграций (по ключу) и ключи
 * с документацией для панели (`/api/external-api`). Записи читает
 * у `RecordsService` — поэтому, как и он, модуль никем не импортируется.
 * Пишет маршрутами панели (`PanelClient`), как MCP.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([ApiKey, Users]),
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
  providers: [ExternalApiService, ExternalWriteService, RecordLookupService, ApiKeysService, ApiKeyGuard, PanelClient],
})
export class ExternalApiModule {}
