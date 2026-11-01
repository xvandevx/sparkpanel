import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { InfoblockSettings } from '../settings/settings.model';
import { InfoblockValuesModule } from '../values/values.module';
import { ProductsController } from './products.controller';
import { Products } from './products.model';
import { ProductsService } from './products.service';

/**
 * Товары — список редактора контента с ключом `products`. Категории товару
 * назначают системным свойством «Категории» (`system-properties.ts`), сами
 * категории — соседний модуль `categories/`.
 */
@Module({
  imports: [
    // Настройки списка только читаются: правила символьного кода
    SequelizeModule.forFeature([Products, InfoblockSettings]),
    HistoryModule,
    // Значения свойств товара уходят вместе с ним
    InfoblockValuesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [ProductsService],
})
export class ProductsModule {}
