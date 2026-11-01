import { Body, Controller, Delete, Get, HttpCode, Param, Put, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { InfoblockColumnDto, SaveInfoblockColumnsDto } from './column.dto';
import { InfoblockColumnsService } from './columns.service';

/**
 * Колонки таблицы списка. `ListEditGuard` здесь нет, в отличие от вкладок
 * и свойств: вид таблицы у каждого свой и чужого не меняет, поэтому
 * настроить колонки «Пользователей» может и тот, кто их только смотрит.
 */
@ApiTags('infoblock-columns')
@ApiBearerAuth('JWT-auth')
@ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
@Controller('infoblocks/settings/:listKey/columns')
export class InfoblockColumnsController {
  constructor(private readonly columnsService: InfoblockColumnsService) {}

  @ApiOperation({
    summary: 'Видимые колонки таблицы по порядку; пусто — колонки по умолчанию',
  })
  @ApiOkResponse({ type: [InfoblockColumnDto] })
  @ApiBadRequestResponse({ description: 'Неизвестный список' })
  @Get()
  findAll(@Req() req: Request, @Param('listKey') listKey: string): Promise<InfoblockColumnDto[]> {
    return this.columnsService.findAll(req.user.id, listKey);
  }

  @ApiOperation({ summary: 'Сохранить вид таблицы целиком: видимые колонки слева направо' })
  @ApiOkResponse({ type: [InfoblockColumnDto] })
  @ApiBadRequestResponse({ description: 'Неизвестный список или колонки описаны с ошибкой' })
  @Put()
  save(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Body() dto: SaveInfoblockColumnsDto,
  ): Promise<InfoblockColumnDto[]> {
    return this.columnsService.save(req.user.id, listKey, dto);
  }

  @ApiOperation({ summary: 'Вернуть колонки по умолчанию' })
  @ApiNoContentResponse({ description: 'Сохранённый вид таблицы стёрт' })
  @HttpCode(204)
  @Delete()
  reset(@Req() req: Request, @Param('listKey') listKey: string): Promise<void> {
    return this.columnsService.reset(req.user.id, listKey);
  }
}
