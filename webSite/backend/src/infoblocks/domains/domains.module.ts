import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InfoblockSettings } from '../settings/settings.model';
import { InfoblockValuesModule } from '../values/values.module';
import { DomainsController } from './domains.controller';
import { Domains } from './domains.model';
import { DomainsService } from './domains.service';

/**
 * Домены сайта — список редактора контента с ключом `domains`, дерево
 * «домен → поддомены». Показывается в настройках сайта, лежит среди списков.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([Domains, InfoblockSettings]),
    // Значения свойств домена уходят вместе с ним
    InfoblockValuesModule,
  ],
  controllers: [DomainsController],
  providers: [DomainsService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [DomainsService],
})
export class DomainsModule {}
