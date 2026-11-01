import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { PropertyValue } from '../values/property-values.model';
import { InfoblockValuesModule } from '../values/values.module';
import { RolesController } from './roles.controller';
import { Roles } from './roles.model';
import { RolesService } from './roles.service';

/**
 * Роли пользователей — список редактора контента с ключом `roles`, как
 * страницы и хранилища. Назначают роль системным свойством «Роль» у пользователя
 * (`infoblocks/settings/properties/system-properties.ts`); значения свойств
 * здесь только читаются — назначенную роль не удаляют.
 */
@Module({
  imports: [SequelizeModule.forFeature([Roles, PropertyValue]), HistoryModule, InfoblockValuesModule],
  controllers: [RolesController],
  providers: [RolesService],
  // Записи списка читает страница таблицы (`infoblocks/records`)
  exports: [RolesService],
})
export class RolesModule {}
