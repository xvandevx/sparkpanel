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
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { CreateFormDto } from './dto/create-form.dto';
import { FormDto } from './dto/form.dto';
import { FormFieldDto } from './dto/form-field.dto';
import { RemovedFormDto } from './dto/removed-form.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormsService } from './forms.service';

@ApiTags('forms')
@ApiBearerAuth('JWT-auth')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @ApiOperation({ summary: 'Все формы пользователя вместе с их полями' })
  @ApiOkResponse({ type: [FormDto] })
  @Get()
  findAll(@Req() req: Request) {
    // userId — из токена, не из запроса: формы всех пользователей в одной таблице
    return this.formsService.findAll(req.user.id);
  }

  // Объявлено до `:id`: иначе Nest примет «history» за идентификатор формы.
  @ApiOperation({ summary: 'Общий журнал изменений раздела «Веб-формы»' })
  @ApiOkResponse({ type: HistoryPageDto })
  @Get('history')
  async findJournal(@Req() req: Request, @Query() query: HistoryQueryDto): Promise<HistoryPageDto> {
    const { rows, count } = await this.formsService.findJournal(
      req.user.id,
      query.limit,
      query.offset,
    );
    return { items: rows.map(HistoryRecordDto.from), total: count };
  }

  @ApiOperation({
    summary: 'История изменений одной записи раздела',
    description: 'entityId — ключ записи с приставкой: `form-1` для формы, `field-3` для поля',
  })
  @ApiOkResponse({ type: [HistoryRecordDto] })
  @Get('history/:entityId')
  async findHistory(
    @Req() req: Request,
    @Param('entityId') entityId: string,
  ): Promise<HistoryRecordDto[]> {
    const records = await this.formsService.findHistory(req.user.id, entityId);
    return records.map(HistoryRecordDto.from);
  }

  @ApiOperation({ summary: 'Одна форма с полями' })
  @ApiOkResponse({ type: FormDto })
  @ApiNotFoundResponse({ description: 'Форма не найдена' })
  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.formsService.findOne(req.user.id, id);
  }

  @ApiOperation({ summary: 'Создать форму' })
  @ApiOkResponse({ type: FormDto })
  @ApiConflictResponse({ description: 'Форма с таким кодом уже есть' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateFormDto) {
    return this.formsService.create(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить форму' })
  @ApiOkResponse({ type: FormDto })
  @ApiConflictResponse({ description: 'Форма с таким кодом уже есть' })
  @ApiNotFoundResponse({ description: 'Форма не найдена' })
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formsService.update(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить форму вместе с её полями' })
  @ApiOkResponse({ type: RemovedFormDto })
  @ApiNotFoundResponse({ description: 'Форма не найдена' })
  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.formsService.remove(req.user.id, id, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Добавить поле в форму' })
  @ApiOkResponse({ type: FormFieldDto })
  @ApiBadRequestResponse({ description: 'У поля «Список» не заданы варианты' })
  @ApiConflictResponse({ description: 'В этой форме уже есть поле с таким кодом' })
  @Post(':formId/fields')
  createField(
    @Req() req: Request,
    @Param('formId', ParseIntPipe) formId: number,
    @Body() dto: CreateFormFieldDto,
  ) {
    return this.formsService.createField(req.user.id, formId, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить поле формы' })
  @ApiOkResponse({ type: FormFieldDto })
  @ApiBadRequestResponse({ description: 'У поля «Список» не заданы варианты' })
  @ApiConflictResponse({ description: 'В этой форме уже есть поле с таким кодом' })
  @ApiNotFoundResponse({ description: 'Поле формы не найдено' })
  @Patch(':formId/fields/:id')
  updateField(
    @Req() req: Request,
    @Param('formId', ParseIntPipe) formId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormFieldDto,
  ) {
    return this.formsService.updateField(req.user.id, formId, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить поле формы' })
  @ApiOkResponse({ type: RemovedFormDto })
  @ApiNotFoundResponse({ description: 'Поле формы не найдено' })
  @Delete(':formId/fields/:id')
  removeField(
    @Req() req: Request,
    @Param('formId', ParseIntPipe) formId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.formsService.removeField(req.user.id, formId, id, historyAuthor(req));
  }
}
