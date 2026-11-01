import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Users } from '../../users/users.model';
import { Contents } from '../contents/contents.model';
import { ContentItems } from '../contents/items/content-items.model';
import { InfoblockDraft } from '../drafts/draft.model';
import { Files } from '../files/files.model';
import { Pages } from '../pages/pages.model';
import { ProductCategories } from '../products/categories/product-categories.model';
import { Products } from '../products/products.model';
import { RecordsModule } from '../records/records.module';
import { Roles } from '../roles/roles.model';
import { InfoblockFilter } from '../settings/filters/filter.model';
import { InfoblockPropertyOption } from '../settings/properties/property-option.model';
import { InfoblockProperty } from '../settings/properties/property.model';
import { InfoblockSettings } from '../settings/settings.model';
import { InfoblockSettingsModule } from '../settings/settings.module';
import { InfoblockTab } from '../settings/tabs/tab.model';
import { PropertyValue } from '../values/property-values.model';
import { InfoblockRecord } from '../values/record.model';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';
import { InfoblockBackup } from './backup.model';

/**
 * Резервные копии списков (`infoblock_backups`). Пишет прямо в таблицы
 * разделов, настроек и значений, поэтому видит их модели; защищённые записи
 * берёт у страницы записей (`RecordsModule`) — модуль, который импортирует
 * все разделы. Сам не импортируется никем.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([
      InfoblockBackup,
      InfoblockSettings,
      InfoblockTab,
      InfoblockProperty,
      InfoblockPropertyOption,
      InfoblockFilter,
      InfoblockRecord,
      PropertyValue,
      InfoblockDraft,
      Files,
      Contents,
      Pages,
      Users,
      Roles,
      Products,
      ProductCategories,
      ContentItems,
    ]),
    InfoblockSettingsModule,
    RecordsModule,
  ],
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}
