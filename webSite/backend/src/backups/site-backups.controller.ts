import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RootOnlyGuard } from '../common';
import { decodeOriginalName } from '../infoblocks/files/files.service';
import { historyAuthor } from '../infoblocks/history/history-author';
import {
  SiteBackupDto,
  SiteBackupsDto,
  UploadSiteBackupDto,
} from './dto/site-backup.dto';
import { SiteBackupsService } from './site-backups.service';

const ID = ':id';

/**
 * Файл копии больше не пропустит nginx (`client_max_body_size 25m`). Сжатый
 * JSON — примерно десятая часть базы.
 */
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

/** Имя скачанного файла: дата копии и номер — файлы разных дней не путаются. */
const fileName = (id: number, createdAt: Date): string =>
  `sparkpanel-site-${createdAt.toISOString().slice(0, 10)}-${id}.json.gz`;

@ApiTags('site-backups')
@ApiBearerAuth('JWT-auth')
@UseGuards(RootOnlyGuard)
@Controller('site-backups')
export class SiteBackupsController {
  constructor(private readonly backups: SiteBackupsService) {}

  @ApiOperation({ summary: 'Копии сайта, новые сверху, и размер базы' })
  @ApiOkResponse({ type: SiteBackupsDto })
  @Get()
  findAll() {
    return this.backups.findAll();
  }

  @ApiOperation({ summary: 'Снять копию базы как она есть сейчас' })
  @ApiOkResponse({ type: SiteBackupDto })
  @Post()
  create(@Req() req: Request) {
    return this.backups.create(historyAuthor(req));
  }

  @ApiOperation({ summary: 'Загрузить копию из файла — того, что выдаёт «Скачать»' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadSiteBackupDto })
  @ApiOkResponse({ type: SiteBackupDto })
  @ApiBadRequestResponse({ description: 'Файл не передан или это не копия сайта' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE } }))
  @Post('upload')
  upload(@Req() req: Request, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.backups.upload(
      decodeOriginalName(file?.originalname ?? ''),
      file?.buffer,
      historyAuthor(req),
    );
  }

  @ApiOperation({ summary: 'Копия файлом: сжатый JSON' })
  @ApiProduces('application/gzip')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Get(`${ID}/file`)
  async file(@Param('id', ParseIntPipe) id: number): Promise<StreamableFile> {
    const { data, createdAt } = await this.backups.file(id);
    return new StreamableFile(data, {
      type: 'application/gzip',
      disposition: `attachment; filename="${fileName(id, createdAt)}"`,
      length: data.length,
    });
  }

  @ApiOperation({
    summary: 'Вернуть базу к копии. Ответ — копия того, что было до восстановления',
  })
  @ApiOkResponse({ type: SiteBackupDto })
  @ApiBadRequestResponse({ description: 'Копия не легла в нынешнюю схему — база не изменилась' })
  @Post(`${ID}/restore`)
  restore(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.backups.restore(id, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить копию' })
  @Delete(ID)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.backups.remove(id);
  }
}
