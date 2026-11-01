import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryModule } from '../history/history.module';
import { DomainsController } from './domains.controller';
import { Domains } from './domains.model';
import { DomainsService } from './domains.service';

@Module({
  imports: [SequelizeModule.forFeature([Domains]), HistoryModule],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
