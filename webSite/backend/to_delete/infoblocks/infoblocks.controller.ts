import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { HistoryQueryDto } from '../history/dto/history-query.dto';
import { HistoryPageDto, HistoryRecordDto } from '../history/dto/history.dto';
import { historyAuthor } from '../history/history-author';
import { CreateInfoblockElementDto } from './dto/create-infoblock-element.dto';
import { CreateInfoblockSectionDto } from './dto/create-infoblock-section.dto';
import { CreateInfoblockDto } from './dto/create-infoblock.dto';
import { InfoblockElementDto } from './dto/infoblock-element.dto';
import { InfoblockSectionDto } from './dto/infoblock-section.dto';
import { InfoblockDto } from './dto/infoblock.dto';
import { RemovedInfoblockDto } from './dto/removed-infoblock.dto';
import { UpdateInfoblockElementDto } from './dto/update-infoblock-element.dto';
import { UpdateInfoblockSectionDto } from './dto/update-infoblock-section.dto';
import { UpdateInfoblockDto } from './dto/update-infoblock.dto';
import { InfoblocksService } from './infoblocks.service';

/**
 * Раздел «Инфоблоки»: структура (разделы и инфоблоки) и элементы инфоблока.
 *
 * Все пути идут через явную приставку — `sections`, `blocks`, `history`.
 * Голого `:id` в корне контроллера нет специально: иначе Nest принял бы
 * за идентификатор и `history`, и `sections`.
 */
@ApiTags('infoblocks')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks')
export class InfoblocksController {
  constructor(private readonly infoblocksService: InfoblocksService) {}

  @ApiOperation({ summary: 'Структура раздела: разделы вместе с их инфоблоками' })
  @ApiOkResponse({ type: [InfoblockSectionDto] })
  @Get()
  findStructure(@Req() req: Request) {
    // userId — из токена, не из запроса: записи всех пользователей в одной таблице
    return this.infoblocksService.findStructure(req.user.id);
  }

  @ApiOperation({ summary: 'Общий журнал изменений раздела «Инфоблоки»' })
  @ApiOkResponse({ type: HistoryPageDto })
  @Get('history')
  async findJournal(@Req() req: Request, @Query() query: HistoryQueryDto): Promise<HistoryPageDto> {
    const { rows, count } = await this.infoblocksService.findJournal(
      req.user.id,
      query.limit,
      query.offset,
    );
    return { items: rows.map(HistoryRecordDto.from), total: count };
  }

  @ApiOperation({
    summary: 'История одной записи; entityId — с приставкой: section-1, block-2, element-3',
  })
  @ApiOkResponse({ type: [HistoryRecordDto] })
  @Get('history/:entityId')
  async findHistory(
    @Req() req: Request,
    @Param('entityId') entityId: string,
  ): Promise<HistoryRecordDto[]> {
    const records = await this.infoblocksService.findHistory(req.user.id, entityId);
    return records.map(HistoryRecordDto.from);
  }

  // ─── Разделы ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Создать раздел инфоблоков' })
  @ApiOkResponse({ type: InfoblockSectionDto })
  @ApiConflictResponse({ description: 'Раздел с таким кодом уже есть' })
  @Post('sections')
  createSection(@Req() req: Request, @Body() dto: CreateInfoblockSectionDto) {
    return this.infoblocksService.createSection(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить раздел инфоблоков' })
  @ApiOkResponse({ type: InfoblockSectionDto })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  @ApiConflictResponse({ description: 'Раздел с таким кодом уже есть' })
  @Patch('sections/:id')
  updateSection(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInfoblockSectionDto,
  ) {
    return this.infoblocksService.updateSection(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить раздел вместе с его инфоблоками и их элементами' })
  @ApiOkResponse({ type: RemovedInfoblockDto })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  @Delete('sections/:id')
  removeSection(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.infoblocksService.removeSection(req.user.id, id, historyAuthor(req));
  }

  // ─── Инфоблоки ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Создать инфоблок в разделе' })
  @ApiOkResponse({ type: InfoblockDto })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  @ApiConflictResponse({ description: 'Инфоблок с таким кодом уже есть' })
  @Post('blocks')
  createBlock(@Req() req: Request, @Body() dto: CreateInfoblockDto) {
    return this.infoblocksService.createBlock(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить инфоблок; sectionId в теле — перенос в другой раздел' })
  @ApiOkResponse({ type: InfoblockDto })
  @ApiNotFoundResponse({ description: 'Инфоблок или раздел не найден' })
  @ApiConflictResponse({ description: 'Инфоблок с таким кодом уже есть' })
  @Patch('blocks/:id')
  updateBlock(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInfoblockDto,
  ) {
    return this.infoblocksService.updateBlock(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить инфоблок вместе с его элементами' })
  @ApiOkResponse({ type: RemovedInfoblockDto })
  @ApiNotFoundResponse({ description: 'Инфоблок не найден' })
  @Delete('blocks/:id')
  removeBlock(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.infoblocksService.removeBlock(req.user.id, id, historyAuthor(req));
  }

  // ─── Элементы ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Элементы инфоблока по порядку' })
  @ApiOkResponse({ type: [InfoblockElementDto] })
  @ApiNotFoundResponse({ description: 'Инфоблок не найден' })
  @Get('blocks/:blockId/elements')
  findElements(@Req() req: Request, @Param('blockId', ParseIntPipe) blockId: number) {
    return this.infoblocksService.findElements(req.user.id, blockId);
  }

  @ApiOperation({ summary: 'Создать элемент инфоблока' })
  @ApiOkResponse({ type: InfoblockElementDto })
  @ApiNotFoundResponse({ description: 'Инфоблок не найден' })
  @ApiConflictResponse({ description: 'В этом инфоблоке уже есть элемент с таким кодом' })
  @Post('blocks/:blockId/elements')
  createElement(
    @Req() req: Request,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Body() dto: CreateInfoblockElementDto,
  ) {
    return this.infoblocksService.createElement(req.user.id, blockId, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить элемент инфоблока' })
  @ApiOkResponse({ type: InfoblockElementDto })
  @ApiNotFoundResponse({ description: 'Элемент не найден' })
  @ApiConflictResponse({ description: 'В этом инфоблоке уже есть элемент с таким кодом' })
  @Patch('blocks/:blockId/elements/:id')
  updateElement(
    @Req() req: Request,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInfoblockElementDto,
  ) {
    return this.infoblocksService.updateElement(req.user.id, blockId, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить элемент инфоблока' })
  @ApiOkResponse({ type: RemovedInfoblockDto })
  @ApiNotFoundResponse({ description: 'Элемент не найден' })
  @Delete('blocks/:blockId/elements/:id')
  removeElement(
    @Req() req: Request,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.infoblocksService.removeElement(req.user.id, blockId, id, historyAuthor(req));
  }
}
