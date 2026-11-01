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
import { ContentsService } from './contents.service';
import { ContentDto } from './dto/content.dto';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

/**
 * Номер типа — только цифры: по тому же пути живут значения свойств списка
 * (`/infoblocks/contents/values`) и элементы типа (`/infoblocks/contents/:contentId/items`).
 */
const ID = ':id(\\d+)';

/**
 * Типы контента — список редактора контента. Журнал — общий маршрут
 * `/api/infoblocks/history/contents`.
 */
@ApiTags('contents')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/contents')
export class ContentsController {
  constructor(private readonly typesService: ContentsService) {}

  @ApiOperation({ summary: 'Типы контента пользователя' })
  @ApiOkResponse({ type: [ContentDto] })
  @Get()
  findAll(): Promise<ContentDto[]> {
    return this.typesService.findAll();
  }

  @ApiOperation({ summary: 'Завести тип контента' })
  @ApiOkResponse({ type: ContentDto })
  @Post()
  create(
    @Req() req: Request,
    @Body() dto: CreateContentDto,
  ): Promise<ContentDto> {
    return this.typesService.create(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить тип контента' })
  @ApiOkResponse({ type: ContentDto })
  @ApiNotFoundResponse({ description: 'Тип не найден' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentDto,
  ): Promise<ContentDto> {
    return this.typesService.update(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить пустой тип контента' })
  @ApiNotFoundResponse({ description: 'Тип не найден' })
  @ApiConflictResponse({
    description: 'В типе есть элементы или вложенные типы',
  })
  @HttpCode(204)
  @Delete(ID)
  remove(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.typesService.remove(req.user.id, id, historyAuthor(req));
  }
}
