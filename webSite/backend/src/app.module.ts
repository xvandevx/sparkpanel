import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { ContentItems } from './infoblocks/contents/items/content-items.model';
import { ContentItemsModule } from './infoblocks/contents/items/content-items.module';
import { Contents } from './infoblocks/contents/contents.model';
import { ContentsModule } from './infoblocks/contents/contents.module';
import { Files } from './infoblocks/files/files.model';
import { FilesModule } from './infoblocks/files/files.module';
import { History } from './infoblocks/history/history.model';
import { HistoryModule } from './infoblocks/history/history.module';
import { FileSections } from './infoblocks/files/sections/file-sections.model';
import { FileSectionsModule } from './infoblocks/files/sections/file-sections.module';
import { FormFields } from './infoblocks/forms/fields/form-fields.model';
import { FormFieldsModule } from './infoblocks/forms/fields/form-fields.module';
import { Forms } from './infoblocks/forms/forms.model';
import { FormsModule } from './infoblocks/forms/forms.module';
import { InfoblockColumn } from './infoblocks/settings/columns/column.model';
import { InfoblockFilter } from './infoblocks/settings/filters/filter.model';
import { InfoblockPropertyOption } from './infoblocks/settings/properties/property-option.model';
import { InfoblockProperty } from './infoblocks/settings/properties/property.model';
import { InfoblockSettings } from './infoblocks/settings/settings.model';
import { InfoblockTab } from './infoblocks/settings/tabs/tab.model';
import { InfoblockSettingsModule } from './infoblocks/settings/settings.module';
import { InfoblockValuesModule } from './infoblocks/values/values.module';
import { PropertyValue } from './infoblocks/values/property-values.model';
import { InfoblockRecord } from './infoblocks/values/record.model';
import { InfoblockDraft } from './infoblocks/drafts/draft.model';
import { DraftsModule } from './infoblocks/drafts/drafts.module';
import { InfoblockBackup } from './infoblocks/backups/backup.model';
import { BackupsModule } from './infoblocks/backups/backups.module';
import { Domains } from './infoblocks/domains/domains.model';
import { DomainsModule } from './infoblocks/domains/domains.module';
import { ApiKey } from './external-api/keys/api-key.model';
import { ExternalApiModule } from './external-api/external-api.module';
import { McpModule } from './mcp/mcp.module';
import { MigrationsModule } from './migrations/migrations.module';
import { SchemaMigration } from './migrations/schema-migration.model';
import { McpCall } from './mcp/calls/mcp-call.model';
import { McpToken } from './mcp/tokens/mcp-token.model';
import { Pages } from './infoblocks/pages/pages.model';
import { PagesModule } from './infoblocks/pages/pages.module';
import { RecordsModule } from './infoblocks/records/records.module';
import { ProductCategories } from './infoblocks/products/categories/product-categories.model';
import { ProductCategoriesModule } from './infoblocks/products/categories/product-categories.module';
import { Products } from './infoblocks/products/products.model';
import { ProductsModule } from './infoblocks/products/products.module';
import { Roles } from './infoblocks/roles/roles.model';
import { RolesModule } from './infoblocks/roles/roles.module';
import { SiteBackup } from './backups/site-backup.model';
import { SiteBackupsModule } from './backups/site-backups.module';
import { Settings } from './settings/settings.model';
import { Storages } from './infoblocks/storages/storages.model';
import { StoragesModule } from './infoblocks/storages/storages.module';
import { SettingsModule } from './settings/settings.module';
import { StorageModule } from './storage/storage.module';
import { Users } from './users/users.model';
import { UsersModule } from './users/users.module';

/**
 * Подключение к базе: `DATABASE_URL` одной строкой (`postgres://user:pass@host:5432/db`,
 * `?sslmode=…` разбирает сам Sequelize) или, если её нет, пять `POSTGRES_*`, как раньше.
 * Строка сильнее: при ней `POSTGRES_*` не читаются вовсе.
 */
const databaseConnection = () =>
  process.env.DATABASE_URL
    ? { uri: process.env.DATABASE_URL }
    : {
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT),
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
      };

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.local.env', '.env'],
      isGlobal: true,
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      ...databaseConnection(),
      // Новую сущность добавлять сюда же. `sync` заводит только новые таблицы
      // (`alter: false`): правку существующей — колонку, индекс, перенос
      // данных — пишут миграцией в `src/migrations/`. `alter: true` молча
      // удалял колонки вместе с данными, на чужой установке это потеря данных
      models: [
        Users,
        Pages,
        History,
        InfoblockSettings,
        InfoblockTab,
        InfoblockColumn,
        InfoblockFilter,
        InfoblockProperty,
        InfoblockPropertyOption,
        InfoblockRecord,
        PropertyValue,
        InfoblockDraft,
        InfoblockBackup,
        SiteBackup,
        FileSections,
        Files,
        Settings,
        Storages,
        Domains,
        Roles,
        ProductCategories,
        Products,
        Forms,
        FormFields,
        Contents,
        ContentItems,
        ApiKey,
        McpToken,
        McpCall,
        SchemaMigration,
      ],
      autoLoadModels: true,
      synchronize: true,
      sync: { alter: false },
    }),
    UsersModule,
    AuthModule,
    HistoryModule,
    PagesModule,
    InfoblockSettingsModule,
    InfoblockValuesModule,
    StorageModule,
    StoragesModule,
    DomainsModule,
    SettingsModule,
    FileSectionsModule,
    FilesModule,
    RolesModule,
    ProductCategoriesModule,
    ProductsModule,
    RecordsModule,
    DraftsModule,
    BackupsModule,
    SiteBackupsModule,
    FormsModule,
    FormFieldsModule,
    ContentsModule,
    ContentItemsModule,
    ExternalApiModule,
    McpModule,
    MigrationsModule,
  ],
  providers: [
    // Все маршруты защищены по умолчанию; публичные помечаются @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
