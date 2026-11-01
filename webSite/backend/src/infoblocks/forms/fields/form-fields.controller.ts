import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { historyAuthor } from '../../history/history-author';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { FormFieldDto } from './dto/form-field.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { FormFieldsService } from './form-fields.service';

/**
 * Номер поля — только цифры: правило общее для маршрутов списков редактора,
 * рядом с ними живут значения свойств (`/infoblocks/:listKey/values`).
 */
const ID = ':id(\\d+)';

/**
 * Поля форм обратной связи — список редактора контента, общий на сайт.
 * Журнал — общий маршрут `/api/infoblocks/history/form-fields`.
 */
@ApiTags('form-fields')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/forms/fields')
export class FormFieldsController {
  constructor(private readonly fieldsService: FormFieldsService) {}

  @ApiOperation({ summary: 'Все поля форм сайта' })
  @ApiOkResponse({ type: [FormFieldDto] })
  @Get()
  findAll(): Promise<FormFieldDto[]> {
    return this.fieldsService.findAll();
  }

  @ApiOperation({ summary: 'Завести поле' })
  @ApiOkResponse({ type: FormFieldDto })
  @ApiConflictResponse({ description: 'Поле с таким кодом уже есть' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateFormFieldDto): Promise<FormFieldDto> {
    return this.fieldsService.create(dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить поле' })
  @ApiOkResponse({ type: FormFieldDto })
  @ApiNotFoundResponse({ description: 'Поле не найдено' })
  @ApiConflictResponse({ description: 'Поле с таким кодом уже есть' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormFieldDto,
  ): Promise<FormFieldDto> {
    return this.fieldsService.update(id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить поле, которое не подключено ни к одной форме' })
  @ApiNotFoundResponse({ description: 'Поле не найдено' })
  @ApiConflictResponse({ description: 'Поле подключено к формам' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.fieldsService.remove(id, historyAuthor(req));
  }
}
