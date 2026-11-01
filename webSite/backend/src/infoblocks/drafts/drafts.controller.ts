import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { historyAuthor } from '../history/history-author';
import { ListEditGuard } from '../settings/list-edit.guard';
import { DraftsService } from './drafts.service';
import { RecordDraftDto, RecordDraftStateDto, SaveRecordDraftDto } from './dto/record-draft.dto';

const LIST_KEY_PARAM = {
  name: 'listKey',
  example: 'pages',
  description: 'Ключ списка: вид и, у вложенных списков, номер владельца',
};
const RECORD_ID_PARAM = { name: 'recordId', example: '2', description: 'Ключ записи в списке' };

/**
 * Черновики записей любого списка. Маршрут `infoblocks/drafts/:listKey`, как
 * у страницы записей и журнала, а не `infoblocks/:listKey/drafts`: у разделов
 * свои маршруты `infoblocks/<раздел>/:id`, и «drafts» на месте номера записи
 * ушёл бы к разделу.
 *
 * Публикация здесь только снимает черновик: поля и значения карточка
 * записывает обычными маршрутами раздела и значений — с их проверками и журналом.
 */
@ApiTags('infoblock-drafts')
@ApiBearerAuth('JWT-auth')
// Пользователей и роли правит только root — см. гард
@UseGuards(ListEditGuard)
@Controller('infoblocks/drafts/:listKey')
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  @ApiOperation({ summary: 'Черновик одной записи' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(RECORD_ID_PARAM)
  @ApiOkResponse({ type: RecordDraftStateDto })
  @Get(':recordId')
  findOne(@Param('listKey') listKey: string, @Param('recordId') recordId: string) {
    return this.drafts.findOne(listKey, recordId);
  }

  @ApiOperation({ summary: 'Сохранить черновик записи: изменённое относительно опубликованного' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(RECORD_ID_PARAM)
  @ApiOkResponse({ type: RecordDraftDto })
  @Put(':recordId')
  save(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Param('recordId') recordId: string,
    @Body() dto: SaveRecordDraftDto,
  ) {
    return this.drafts.save(listKey, recordId, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить черновик: запись возвращается к опубликованному' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(RECORD_ID_PARAM)
  @ApiConflictResponse({ description: 'Запись ещё не публиковалась — её удаляют целиком' })
  @Delete(':recordId')
  discard(@Param('listKey') listKey: string, @Param('recordId') recordId: string) {
    return this.drafts.discard(listKey, recordId);
  }

  @ApiOperation({ summary: 'Снять опубликованный черновик: поля и значения уже записаны' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam(RECORD_ID_PARAM)
  @Post(':recordId/publish')
  publish(@Param('listKey') listKey: string, @Param('recordId') recordId: string) {
    return this.drafts.publish(listKey, recordId);
  }
}
