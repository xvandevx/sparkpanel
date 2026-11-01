import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../../history/history.module';
import { PropertyValue } from '../../values/property-values.model';
import { InfoblockValuesModule } from '../../values/values.module';
import { FormFieldsController } from './form-fields.controller';
import { FormFields } from './form-fields.model';
import { FormFieldsService } from './form-fields.service';

/**
 * Поля форм — список редактора контента с ключом `form-fields`. Форме их
 * подключают системным свойством «Поля»; значения свойств здесь только
 * читаются — подключённое поле не удаляют.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([FormFields, PropertyValue]),
    HistoryModule,
    // Значения свойств самого поля уходят вместе с ним
    InfoblockValuesModule,
  ],
  controllers: [FormFieldsController],
  providers: [FormFieldsService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [FormFieldsService],
})
export class FormFieldsModule {}
