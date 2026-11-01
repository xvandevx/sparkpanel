import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { historyAuthor } from '../history/history-author';
import { RecordValuesDto, UpdatePropertyValuesDto } from './property-values.dto';
import { RemovedPropertyValuesDto, RemovePropertyValuesQueryDto } from './remove-property-values.dto';
import { PropertyValuesService } from './property-values.service';
import { ListEditGuard } from '../settings/list-edit.guard';

/**
 * Значения свойств записей: своя сущность — свой контроллер, как у вкладок
 * и свойств. Настройки списка (имя, код, правила записей) живут в соседнем:
 * они описывают список, а здесь лежит то, что заполнили в записях.
 */
const LIST_KEY_PARAM = {
  name: 'listKey',
  example: 'infoblock-elements.3',
  description: 'Ключ списка: вид и, у вложенных списков, номер владельца',
};

@ApiTags('infoblock-values')
@ApiBearerAuth('JWT-auth')
// Пользователей и роли правит только root — см. гард
@UseGuards(ListEditGuard)
@Controller('infoblocks/:listKey/values')
export class InfoblockValuesController {
  constructor(private readonly valuesService: PropertyValuesService) {}

  // Значений всего списка маршрутом нет: таблица получает их со своей
  // страницей (`infoblocks/records`), а карточке нужна одна запись
  @ApiOperation({ summary: 'Значения свойств одной записи' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam({ name: 'recordId', example: 'element-7', description: 'Ключ записи в списке' })
  @ApiOkResponse({ type: RecordValuesDto })
  @Get(':recordId')
  findOne(@Param('listKey') listKey: string, @Param('recordId') recordId: string) {
    return this.valuesService.findOne(listKey, recordId);
  }

  @ApiOperation({ summary: 'Стереть значения свойств удалённых записей' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiOkResponse({ type: RemovedPropertyValuesDto })
  @Delete()
  remove(
    @Param('listKey') listKey: string,
    @Query() query: RemovePropertyValuesQueryDto,
  ) {
    return this.valuesService.remove(listKey, query.recordIds);
  }

  @ApiOperation({ summary: 'Сохранить изменённые значения свойств записи' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiParam({ name: 'recordId', example: 'element-7', description: 'Ключ записи в списке' })
  @ApiOkResponse({ type: RecordValuesDto })
  @ApiBadRequestResponse({ description: 'Значение не подходит под свойство' })
  @Patch(':recordId')
  save(
    @Req() req: Request,
    @Param('listKey') listKey: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdatePropertyValuesDto,
  ) {
    return this.valuesService.save(req.user.id, listKey, recordId, dto, historyAuthor(req));
  }
}
