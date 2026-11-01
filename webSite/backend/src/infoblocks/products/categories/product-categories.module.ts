import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../../history/history.module';
import { InfoblockSettings } from '../../settings/settings.model';
import { PropertyValue } from '../../values/property-values.model';
import { InfoblockValuesModule } from '../../values/values.module';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategories } from './product-categories.model';
import { ProductCategoriesService } from './product-categories.service';

/**
 * Категории товаров — список редактора контента с ключом `product-categories`.
 * Товару их назначают системным свойством «Категории»; значения свойств здесь
 * только читаются — категорию с товарами не удаляют.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([ProductCategories, PropertyValue, InfoblockSettings]),
    HistoryModule,
    // Значения свойств самой категории уходят вместе с ней
    InfoblockValuesModule,
  ],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [ProductCategoriesService],
})
export class ProductCategoriesModule {}
