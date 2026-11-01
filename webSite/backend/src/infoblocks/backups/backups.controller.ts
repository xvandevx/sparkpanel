import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { historyAuthor } from '../history/history-author';
import { BackupAccessGuard } from './backup-access.guard';
import { BackupsService } from './backups.service';
import {
  BackupCheckDto,
  BackupDto,
  CreateBackupDto,
  RestoreBackupDto,
  UploadBackupDto,
} from './dto/backup.dto';

const LIST_KEY_PARAM = {
  name: 'listKey',
  example: 'products',
  description: 'Ключ списка: вид и, у вложенных списков, номер владельца',
};
const ID_PARAM = { name: 'id', example: 3, description: 'Номер копии' };

/**
 * Резервные копии списка. Маршрут `infoblocks/backups/:listKey`, как
 * у черновиков и журнала: у разделов свои маршруты `infoblocks/<раздел>/:id`.
 */
@ApiTags('infoblock-backups')
@ApiBearerAuth('JWT-auth')
@UseGuards(BackupAccessGuard)
@Controller('infoblocks/backups/:listKey')
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @ApiOperation({ summary: 'Копии списка, новые сверху' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiOkResponse({ type: [BackupDto] })
  @ApiBadRequestResponse({ description: 'У списка нет резервных копий' })
  @Get()
  findAll(@Param('listKey') listKey: string) {
    return this.backups.findAll(listKey);
  }

  @ApiOperation({ summary: 'Снять копию списка как он есть сейчас' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiOkResponse({ type: BackupDto })
  @Post()
  create(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Body() dto: CreateBackupDto,
  ) {
    return this.backups.create(listKey, dto.note ?? '', historyAuthor(req));
  }

  @ApiOperation({
    summary: 'Загрузить копию из файла — того, что выдаёт «Скачать»',
  })
  @ApiParam(LIST_KEY_PARAM)
  @ApiOkResponse({ type: BackupDto })
  @ApiBadRequestResponse({
    description: 'Файл не копия или копия другого списка',
  })
  @Post('upload')
  upload(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Body() dto: UploadBackupDto,
  ) {
    return this.backups.upload(
      listKey,
      dto.note ?? '',
      dto.data,
      historyAuthor(req),
    );
  }

  @ApiOperation({ summary: 'Копия целиком — для файла' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ schema: { type: 'object', additionalProperties: true } })
  @Get(':id/file')
  file(
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.backups.file(listKey, id);
  }

  @ApiOperation({ summary: 'Что изменится, если вернуть копию' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: BackupCheckDto })
  @Get(':id/check')
  check(@Param('listKey') listKey: string, @Param('id', ParseIntPipe) id: number) {
    return this.backups.check(listKey, id);
  }

  @ApiOperation({
    summary: 'Вернуть копию. Ответ — копия того, что было до восстановления',
  })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ type: BackupDto })
  @ApiConflictResponse({ description: 'Копия сделана не для этого списка' })
  @Post(':id/restore')
  restore(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestoreBackupDto,
  ) {
    return this.backups.restore(listKey, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить копию' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(ID_PARAM)
  @Delete(':id')
  remove(
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.backups.remove(listKey, id);
  }
}
