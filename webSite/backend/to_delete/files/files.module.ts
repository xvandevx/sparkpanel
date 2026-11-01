import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FileSections } from './file-section.model';
import { FileSectionsController } from './file-sections.controller';
import { FileSectionsService } from './file-sections.service';
import { FilesController } from './files.controller';
import { Files } from './files.model';
import { FilesService } from './files.service';

/**
 * Медиатека: файлы и разделы, по которым они разложены. Раздел без файлов —
 * пустая строка справочника, файл без раздела не существует, поэтому это одна
 * фича и один модуль, а не два: счётчик файлов отдаётся вместе с разделом.
 */
@Module({
  imports: [SequelizeModule.forFeature([Files, FileSections])],
  controllers: [FilesController, FileSectionsController],
  providers: [FilesService, FileSectionsService],
  exports: [FilesService, FileSectionsService],
})
export class FilesModule {}
