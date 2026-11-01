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
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { DomainDto } from './dto/domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

@ApiTags('domains')
@ApiBearerAuth('JWT-auth')
@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @ApiOperation({ summary: 'Все домены пользователя; основной первым' })
  @ApiOkResponse({ type: [DomainDto] })
  @Get()
  findAll(@Req() req: Request) {
    // userId — из токена, не из запроса: домены всех пользователей в одной таблице
    return this.domainsService.findAll(req.user.id);
  }

  // Объявлено до `:id`: иначе Nest примет «history» за идентификатор домена.
  @ApiOperation({ summary: 'Общий журнал изменений доменов' })
  @ApiOkResponse({ type: HistoryPageDto })
  @Get('history')
  async findJournal(@Req() req: Request, @Query() query: HistoryQueryDto): Promise<HistoryPageDto> {
    const { rows, count } = await this.domainsService.findJournal(
      req.user.id,
      query.limit,
      query.offset,
    );
    return { items: rows.map(HistoryRecordDto.from), total: count };
  }

  @ApiOperation({ summary: 'Один домен' })
  @ApiOkResponse({ type: DomainDto })
  @ApiNotFoundResponse({ description: 'Домен не найден' })
  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.domainsService.findOne(req.user.id, id);
  }

  @ApiOperation({ summary: 'История изменений одного домена' })
  @ApiOkResponse({ type: [HistoryRecordDto] })
  @Get(':id/history')
  async findHistory(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<HistoryRecordDto[]> {
    const records = await this.domainsService.findHistory(req.user.id, id);
    return records.map(HistoryRecordDto.from);
  }

  @ApiOperation({ summary: 'Добавить домен; имя без точки дополняется основным доменом' })
  @ApiOkResponse({ type: DomainDto })
  @ApiConflictResponse({ description: 'Такой домен уже есть' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateDomainDto) {
    return this.domainsService.create(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить домен' })
  @ApiOkResponse({ type: DomainDto })
  @ApiNotFoundResponse({ description: 'Домен не найден' })
  @ApiConflictResponse({ description: 'Такой домен уже есть' })
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDomainDto,
  ) {
    return this.domainsService.update(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить домен; основной удалить нельзя' })
  @ApiOkResponse({ description: 'Домен удалён' })
  @ApiBadRequestResponse({ description: 'Попытка удалить основной домен' })
  @ApiNotFoundResponse({ description: 'Домен не найден' })
  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.domainsService.remove(req.user.id, id, historyAuthor(req));
  }
}
