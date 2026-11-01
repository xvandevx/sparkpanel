import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { InfoblockSettings } from '../settings/settings.model';
import { InfoblockValuesModule } from '../values/values.module';
import { PagesController } from './pages.controller';
import { Pages } from './pages.model';
import { PagesService } from './pages.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Pages, InfoblockSettings]),
    HistoryModule,
    // Адрес страницы — значение свойства: читается и проверяется там
    InfoblockValuesModule,
  ],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
