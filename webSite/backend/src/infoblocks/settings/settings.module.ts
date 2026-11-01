import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { InfoblockColumn } from './columns/column.model';
import { InfoblockColumnsController } from './columns/columns.controller';
import { InfoblockColumnsService } from './columns/columns.service';
import { InfoblockFilter } from './filters/filter.model';
import { InfoblockFiltersController } from './filters/filters.controller';
import { InfoblockFiltersService } from './filters/filters.service';
import { FormFields } from '../forms/fields/form-fields.model';
import { Forms } from '../forms/forms.model';
import { Contents } from '../contents/contents.model';
import { ContentItems } from '../contents/items/content-items.model';
import { Pages } from '../pages/pages.model';
import { Products } from '../products/products.model';
import { ProductCategories } from '../products/categories/product-categories.model';
import { Roles } from '../roles/roles.model';
import { LinkTargetsService } from './links/link-targets.service';
import { InfoblockSettingsController } from './settings.controller';
import { InfoblockPropertyOption } from './properties/property-option.model';
import { InfoblockPropertiesController } from './properties/properties.controller';
import { InfoblockPropertiesService } from './properties/properties.service';
import { InfoblockProperty } from './properties/property.model';
import { SystemPropertiesService } from './properties/system-properties.service';
import { InfoblockSettings } from './settings.model';
import { InfoblockTabsController } from './tabs/tabs.controller';
import { InfoblockTabsService } from './tabs/tabs.service';
import { InfoblockTab } from './tabs/tab.model';
import { PropertyValue } from '../values/property-values.model';
import { InfoblockDraft } from '../drafts/draft.model';
import { InfoblockSettingsService } from './settings.service';

/**
 * Настройки списков: имя, код, вкладки карточки, свойства записей, колонки
 * и фильтр таблицы у любого экрана редактора контента. Чем эти свойства заполнили —
 * не здесь: значения записей живут своим модулем (`infoblocks/values`).
 *
 * Блоки, страницы, роли, категории товаров, формы и их поля здесь только читаются —
 * чтобы свойство ссылалось на свои и было из чего выбирать привязку к контенту.
 * Инфоблоки вернутся сюда вместе со своим модулем из `to_delete/`.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([
      InfoblockSettings,
      InfoblockTab,
      InfoblockColumn,
      InfoblockFilter,
      InfoblockProperty,
      InfoblockPropertyOption,
      Pages,
      Contents,
      ContentItems,
      Roles,
      Products,
      ProductCategories,
      Forms,
      FormFields,
      // Только чтобы знать, заполнено ли свойство: от этого зависит смена его типа
      PropertyValue,
      // Черновики записей: выключить их нельзя, пока они есть. Отсюда же модель
      // берут модуль черновиков и значения (удалили запись — ушёл её черновик)
      InfoblockDraft,
    ]),
    HistoryModule,
  ],
  controllers: [
    InfoblockSettingsController,
    InfoblockTabsController,
    InfoblockColumnsController,
    InfoblockFiltersController,
    InfoblockPropertiesController,
  ],
  providers: [
    InfoblockSettingsService,
    InfoblockPropertiesService,
    InfoblockTabsService,
    InfoblockColumnsService,
    InfoblockFiltersService,
    LinkTargetsService,
    // Сверка системных свойств с перечнем — при старте сервера
    SystemPropertiesService,
  ],
  // Значения записей лежат своим модулем и читают настройки отсюда
  exports: [InfoblockSettingsService, LinkTargetsService, SystemPropertiesService, SequelizeModule],
})
export class InfoblockSettingsModule {}
