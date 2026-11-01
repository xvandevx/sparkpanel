import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Contents } from '../../contents/contents.model';
import { Files } from '../files.model';
import { InfoblockProperty } from '../../settings/properties/property.model';
import { InfoblockSettings } from '../../settings/settings.model';
import { FileSectionsController } from './file-sections.controller';
import { FileSections } from './file-sections.model';
import { FileSectionsService } from './file-sections.service';

/**
 * Разделы файлов — список редактора контента, как страницы. Сервис отдаётся
 * наружу: свойства заводят под себя раздел, медиатека кладёт файлы в разделы.
 */
@Module({
  imports: [SequelizeModule.forFeature([FileSections, Files, InfoblockProperty, InfoblockSettings, Contents])],
  controllers: [FileSectionsController],
  providers: [FileSectionsService],
  exports: [FileSectionsService],
})
export class FileSectionsModule {}
