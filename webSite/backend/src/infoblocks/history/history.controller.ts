import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { HistoryQueryDto } from './dto/history-query.dto';
import { HistoryClearDto, HistoryPageDto, HistoryRecordDto } from './dto/history.dto';
import { RootOnlyGuard } from '../../common';
import { HistoryService } from './history.service';
import { assertRecordId, resolveInfoblock } from '../settings/infoblock-kinds';

/**
 * Журнал изменений — одна сущность на всю панель: в `history` лежат
 * правки всех разделов, и отличаются они только полем `entity`. Поэтому и
 * читается журнал одним маршрутом для любого списка, а не своим у каждого
 * раздела: редактор контента везде один и спрашивает по ключу списка.
 *
 * Какому типу записей соответствует ключ, знает `list-kinds`; у списков без
 * журнала (медиатека) его там нет — тогда 400, а не пустой ответ: пустой
 * нельзя отличить от «правок ещё не было».
 */
@ApiTags('history')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @ApiOperation({ summary: 'Журнал изменений списка' })
  @ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
  @ApiOkResponse({ type: HistoryPageDto })
  @ApiBadRequestResponse({ description: 'Неизвестный список или у него нет журнала' })
  @ApiForbiddenResponse({ description: 'Журнал списка доступен только главному администратору' })
  @Get(':listKey')
  async findJournal(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Query() query: HistoryQueryDto,
  ): Promise<HistoryPageDto> {
    const { rows, count } = await this.historyService.findByEntity(this.entityOf(listKey, req),
      query.limit,
      query.offset,
    );
    return { items: rows.map(HistoryRecordDto.from), total: count };
  }

  @ApiOperation({ summary: 'История одной записи списка' })
  @ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
  @ApiParam({ name: 'recordId', example: '2', description: 'Ключ записи: `2`, `element-7`' })
  @ApiOkResponse({ type: [HistoryRecordDto] })
  @ApiBadRequestResponse({ description: 'Неизвестный список, неверный ключ записи или нет журнала' })
  @Get(':listKey/:recordId')
  async findRecord(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Param('recordId') recordId: string,
  ): Promise<HistoryRecordDto[]> {
    assertRecordId(recordId);
    const rows = await this.historyService.findByEntityId(this.entityOf(listKey, req),
      recordId,
    );
    return rows.map(HistoryRecordDto.from);
  }

  /**
   * Очистка журнала — только главный администратор: журнал общий, как и
   * записи, и очистка стирает правки всех пользователей.
   */
  @ApiOperation({ summary: 'Очистить историю одной записи списка' })
  @ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
  @ApiParam({ name: 'recordId', example: '2', description: 'Ключ записи: `2`, `element-7`' })
  @ApiOkResponse({ type: HistoryClearDto })
  @ApiBadRequestResponse({ description: 'Неизвестный список, неверный ключ записи или нет журнала' })
  @ApiForbiddenResponse({ description: 'Очищает журнал только главный администратор' })
  @UseGuards(RootOnlyGuard)
  @Delete(':listKey/:recordId')
  async clearRecord(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Param('recordId') recordId: string,
  ): Promise<HistoryClearDto> {
    assertRecordId(recordId);
    const deleted = await this.historyService.clear(this.entityOf(listKey, req), recordId);
    return { deleted };
  }

  @ApiOperation({ summary: 'Очистить весь журнал изменений списка' })
  @ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
  @ApiOkResponse({ type: HistoryClearDto })
  @ApiBadRequestResponse({ description: 'Неизвестный список или у него нет журнала' })
  @ApiForbiddenResponse({ description: 'Очищает журнал только главный администратор' })
  @UseGuards(RootOnlyGuard)
  @Delete(':listKey')
  async clearJournal(
    @Req() req: Request,
    @Param('listKey') listKey: string,
  ): Promise<HistoryClearDto> {
    const deleted = await this.historyService.clear(this.entityOf(listKey, req));
    return { deleted };
  }

  /**
   * Тип записей по ключу списка; у списка без журнала его нет.
   *
   * Право на журнал — правило списка, а не редактора: управление учётными
   * записями целиком принадлежит главному администратору, и история правок
   * в это управление входит.
   */
  private entityOf(listKey: string, req: Request): string {
    const { entity, isRootOnly } = resolveInfoblock(listKey);
    if (entity === null) throw new BadRequestException(`У списка ${listKey} нет журнала`);
    if (isRootOnly && !req.user.isRoot) {
      throw new ForbiddenException('Журнал этого списка видит только главный администратор');
    }
    return entity;
  }
}
