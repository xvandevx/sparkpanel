import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { PropertyValue } from '../values/property-values.model';
import { InfoblockValuesModule } from '../values/values.module';
import { FormsController } from './forms.controller';
import { Forms } from './forms.model';
import { FormsService } from './forms.service';

/**
 * Формы обратной связи — список редактора контента с ключом `forms`. Поля форме
 * подключают системным свойством «Поля» (`system-properties.ts`), сами поля —
 * соседний модуль `fields/`.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([Forms, PropertyValue]),
    HistoryModule,
    // Значения свойств формы уходят вместе с ней
    InfoblockValuesModule,
  ],
  controllers: [FormsController],
  providers: [FormsService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [FormsService],
})
export class FormsModule {}
