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
import { historyAuthor } from '../history/history-author';
import { CreateFormDto } from './dto/create-form.dto';
import { FormDto } from './dto/form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormsService } from './forms.service';

/**
 * Номер формы — только цифры: по тому же пути живут значения свойств списка
 * (`/infoblocks/forms/values`) и поля форм (`/infoblocks/forms/fields`).
 */
const ID = ':id(\\d+)';

/**
 * Формы обратной связи — список редактора контента, общий на сайт: владельца
 * у форм нет. Журнал — общий маршрут `/api/infoblocks/history/forms`.
 */
@ApiTags('forms')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @ApiOperation({ summary: 'Все формы сайта' })
  @ApiOkResponse({ type: [FormDto] })
  @Get()
  findAll(): Promise<FormDto[]> {
    return this.formsService.findAll();
  }

  @ApiOperation({ summary: 'Завести форму' })
  @ApiOkResponse({ type: FormDto })
  @ApiConflictResponse({ description: 'Форма с таким кодом уже есть' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateFormDto): Promise<FormDto> {
    return this.formsService.create(dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить форму' })
  @ApiOkResponse({ type: FormDto })
  @ApiNotFoundResponse({ description: 'Форма не найдена' })
  @ApiConflictResponse({ description: 'Форма с таким кодом уже есть' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormDto,
  ): Promise<FormDto> {
    return this.formsService.update(id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить форму вместе со значениями её свойств' })
  @ApiNotFoundResponse({ description: 'Форма не найдена' })
  @ApiConflictResponse({ description: 'Форма выбрана в привязке другой записи' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.formsService.remove(id, historyAuthor(req));
  }
}
