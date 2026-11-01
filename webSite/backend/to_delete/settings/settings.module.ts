import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SettingsController } from './settings.controller';
import { Settings } from './settings.model';
import { SettingsService } from './settings.service';

@Module({
  imports: [SequelizeModule.forFeature([Settings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
