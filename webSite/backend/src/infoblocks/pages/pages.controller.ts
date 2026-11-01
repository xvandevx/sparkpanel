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
  ApiBadRequestResponse,
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
import { CreatePageDto } from './dto/create-page.dto';
import { PageDto } from './dto/page.dto';
import { RemovedPagesDto } from './dto/removed-pages.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PagesService } from './pages.service';

/**
 * Номер страницы — только цифры. Без этого `:id` перехватывал бы соседние
 * маршруты того же пути: значения свойств списка живут по
 * `/infoblocks/pages/values`, и «values» уходило сюда как номер страницы.
 */
const ID = ':id(\\d+)';

@ApiTags('pages')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @ApiOperation({ summary: 'Все страницы пользователя плоским списком (дерево собирает фронт)' })
  @ApiOkResponse({ type: [PageDto] })
  @Get()
  findAll() {
    return this.pagesService.findAll();
  }

  // Объявлено до `:id`: иначе Nest примет «history» за идентификатор страницы.
  @ApiOperation({ summary: 'Общий журнал изменений раздела «Страницы»' })
  @ApiOkResponse({ type: HistoryPageDto })
  @Get('history')
  async findJournal(@Query() query: HistoryQueryDto): Promise<HistoryPageDto> {
    const { rows, count } = await this.pagesService.findJournal(
      query.limit,
      query.offset,
    );
    return { items: rows.map(HistoryRecordDto.from), total: count };
  }

  @ApiOperation({ summary: 'Одна страница' })
  @ApiOkResponse({ type: PageDto })
  @ApiNotFoundResponse({ description: 'Страница не найдена' })
  @Get(ID)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.findOne(id);
  }

  @ApiOperation({ summary: 'История изменений одной страницы' })
  @ApiOkResponse({ type: [HistoryRecordDto] })
  @Get(`${ID}/history`)
  async findHistory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<HistoryRecordDto[]> {
    const records = await this.pagesService.findHistory(id);
    return records.map(HistoryRecordDto.from);
  }

  @ApiOperation({ summary: 'Создать страницу; без parentId она встанет в корень сайта' })
  @ApiOkResponse({ type: PageDto })
  @ApiBadRequestResponse({ description: 'У вложенной страницы пустой код' })
  @ApiConflictResponse({ description: 'У соседней страницы уже есть такой код' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreatePageDto) {
    return this.pagesService.create(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить страницу; parentId: null — перенос в корень сайта' })
  @ApiOkResponse({ type: PageDto })
  @ApiBadRequestResponse({ description: 'Недопустимый перенос или пустой код у вложенной страницы' })
  @ApiConflictResponse({ description: 'У соседней страницы уже есть такой код' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pagesService.update(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить страницу вместе со вложенными' })
  @ApiOkResponse({ type: RemovedPagesDto })
  @Delete(ID)
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.pagesService.remove(req.user.id, id, historyAuthor(req));
  }
}
