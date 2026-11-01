import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { InfoblockElements } from './infoblock-element.model';
import { InfoblockSections } from './infoblock-section.model';
import { Infoblocks } from './infoblock.model';
import { InfoblocksController } from './infoblocks.controller';
import { InfoblocksService } from './infoblocks.service';

/**
 * Инфоблоки: разделы → инфоблоки → элементы. Три сущности, один модуль —
 * это одна фича: порознь они не существуют, а удаление верхнего уровня
 * должно уносить нижние в одной транзакции.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([InfoblockSections, Infoblocks, InfoblockElements]),
    HistoryModule,
  ],
  controllers: [InfoblocksController],
  providers: [InfoblocksService],
  exports: [InfoblocksService],
})
export class InfoblocksModule {}
