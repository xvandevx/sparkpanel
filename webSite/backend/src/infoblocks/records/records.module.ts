import { Module } from '@nestjs/common';
import { UsersModule } from '../../users/users.module';
import { ContentsModule } from '../contents/contents.module';
import { ContentItemsModule } from '../contents/items/content-items.module';
import { DomainsModule } from '../domains/domains.module';
import { DraftsModule } from '../drafts/drafts.module';
import { FilesModule } from '../files/files.module';
import { FileSectionsModule } from '../files/sections/file-sections.module';
import { FormFieldsModule } from '../forms/fields/form-fields.module';
import { FormsModule } from '../forms/forms.module';
import { PagesModule } from '../pages/pages.module';
import { ProductCategoriesModule } from '../products/categories/product-categories.module';
import { ProductsModule } from '../products/products.module';
import { RolesModule } from '../roles/roles.module';
import { InfoblockSettingsModule } from '../settings/settings.module';
import { StoragesModule } from '../storages/storages.module';
import { InfoblockValuesModule } from '../values/values.module';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

/**
 * Страница записей для таблицы редактора контента — у всех списков одна.
 * Читает записи у сервисов разделов, поэтому импортирует их модули;
 * сам импортируется только резервными копиями и внешним API — модуль
 * разделов его импортировать не может, иначе модули замкнулись бы в кольцо.
 */
@Module({
  imports: [
    PagesModule,
    UsersModule,
    RolesModule,
    ProductsModule,
    ProductCategoriesModule,
    FormsModule,
    FormFieldsModule,
    ContentsModule,
    ContentItemsModule,
    FileSectionsModule,
    FilesModule,
    StoragesModule,
    DomainsModule,
    InfoblockSettingsModule,
    InfoblockValuesModule,
    DraftsModule,
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
  // Резервным копиям и внешнему API — записи раздела с его вычисляемыми полями
  exports: [RecordsService],
})
export class RecordsModule {}
