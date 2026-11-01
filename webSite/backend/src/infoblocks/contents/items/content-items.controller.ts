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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { historyAuthor } from '../../history/history-author';
import { ContentItemsService } from './content-items.service';
import { ContentItemDto } from './dto/content-item.dto';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { UpdateContentItemDto } from './dto/update-content-item.dto';

/** Номера — только цифры: рядом живут значения свойств (`/infoblocks/:listKey/values`). */
const ID = ':id(\\d+)';

/**
 * Элементы одного типа контента, список редактора `content-items.<contentId>`.
 * Тип в адресе первым: элемент адресуется только вместе с ним. Сами типы —
 * модуль уровнем выше (`/infoblocks/contents`). Журнал — общий маршрут
 * `/api/infoblocks/history/content-items.<contentId>`.
 */
@ApiTags('content-items')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/contents/:contentId(\\d+)/items')
export class ContentItemsController {
  constructor(private readonly elementsService: ContentItemsService) {}

  @ApiOperation({ summary: 'Элементы типа контента' })
  @ApiOkResponse({ type: [ContentItemDto] })
  @ApiNotFoundResponse({ description: 'Тип не найден' })
  @Get()
  findAll(
    @Param('contentId', ParseIntPipe) contentId: number,
  ): Promise<ContentItemDto[]> {
    return this.elementsService.findAll(contentId);
  }

  @ApiOperation({ summary: 'Завести элемент в типе' })
  @ApiOkResponse({ type: ContentItemDto })
  @ApiNotFoundResponse({ description: 'Тип не найден' })
  @Post()
  create(
    @Req() req: Request,
    @Param('contentId', ParseIntPipe) contentId: number,
    @Body() dto: CreateContentItemDto,
  ): Promise<ContentItemDto> {
    return this.elementsService.create(
      req.user.id,
      contentId,
      dto,
      historyAuthor(req),
    );
  }

  @ApiOperation({ summary: 'Изменить элемент' })
  @ApiOkResponse({ type: ContentItemDto })
  @ApiNotFoundResponse({ description: 'Элемент не найден' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('contentId', ParseIntPipe) contentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentItemDto,
  ): Promise<ContentItemDto> {
    return this.elementsService.update(
      req.user.id,
      contentId,
      id,
      dto,
      historyAuthor(req),
    );
  }

  @ApiOperation({ summary: 'Удалить элемент вместе со значениями его свойств' })
  @ApiNotFoundResponse({ description: 'Элемент не найден' })
  @HttpCode(204)
  @Delete(ID)
  remove(
    @Req() req: Request,
    @Param('contentId', ParseIntPipe) contentId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.elementsService.remove(
      req.user.id,
      contentId,
      id,
      historyAuthor(req),
    );
  }
}
