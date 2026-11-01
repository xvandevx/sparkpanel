import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Files } from '../files/files.model';
import { Domains } from '../domains/domains.model';
import { HistoryModule } from '../history/history.module';
import { InfoblockSettingsModule } from '../settings/settings.module';
import { PropertyValue } from './property-values.model';
import { PropertyValuesService } from './property-values.service';
import { InfoblockRecord } from './record.model';
import { InfoblockValuesController } from './values.controller';

/**
 * Значения свойств записей: что заполнено в самих записях. Отдельно
 * от `settings/` намеренно — там описание списка (имя, вкладки, свойства),
 * а здесь данные, которые по этому описанию заполняют.
 *
 * Настройки отсюда только читаются: по ним значения проверяются и находятся.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([InfoblockRecord, PropertyValue, Files, Domains]),
    InfoblockSettingsModule,
    HistoryModule,
  ],
  controllers: [InfoblockValuesController],
  providers: [PropertyValuesService],
  exports: [PropertyValuesService],
})
export class InfoblockValuesModule {}
