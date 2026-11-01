import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RecordsPageQueryDto } from './dto/records-page-query.dto';
import { RecordsPageDto } from './dto/records-page.dto';
import { RecordsService } from './records.service';

/**
 * Страница записей любого списка — для таблицы редактора контента. Один
 * маршрут на все списки: страница, поиск, фильтр и сортировка у них общие.
 * Писать записи — по-прежнему маршрутами своих разделов.
 */
@ApiTags('infoblock-records')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @ApiOperation({ summary: 'Страница записей списка: поиск, фильтр, сортировка' })
  @ApiParam({
    name: 'listKey',
    example: 'content-items.3',
    description: 'Ключ списка: вид и, у вложенных списков, номер владельца',
  })
  @ApiOkResponse({ type: RecordsPageDto })
  @ApiBadRequestResponse({ description: 'Неизвестный список или непонятный фильтр' })
  @Get(':listKey')
  page(@Param('listKey') listKey: string, @Query() query: RecordsPageQueryDto) {
    return this.recordsService.page(listKey, query);
  }
}
