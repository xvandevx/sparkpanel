import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SaveInfoblockFiltersDto } from './filter.dto';
import { InfoblockFiltersService } from './filters.service';

/**
 * Набор полей фильтра таблицы списка — один на всех, кто список видит.
 * `ListEditGuard` здесь нет, в отличие от вкладок и свойств: поля в фильтр
 * ставит любой, кто смотрит таблицу, — и тот, кто «Пользователей» только смотрит.
 */
@ApiTags('infoblock-filters')
@ApiBearerAuth('JWT-auth')
@ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
@Controller('infoblocks/settings/:listKey/filters')
export class InfoblockFiltersController {
  constructor(private readonly filtersService: InfoblockFiltersService) {}

  @ApiOperation({ summary: 'Ключи полей фильтра по порядку; пусто — фильтра нет' })
  @ApiOkResponse({ type: [String] })
  @ApiBadRequestResponse({ description: 'Неизвестный список' })
  @Get()
  findAll(@Param('listKey') listKey: string): Promise<string[]> {
    return this.filtersService.findAll(listKey);
  }

  @ApiOperation({ summary: 'Сохранить набор полей фильтра целиком; пустой — убрать фильтр' })
  @ApiOkResponse({ type: [String] })
  @ApiBadRequestResponse({ description: 'Неизвестный список или ключи с ошибкой' })
  @Put()
  save(
    @Param('listKey') listKey: string,
    @Body() dto: SaveInfoblockFiltersDto,
  ): Promise<string[]> {
    return this.filtersService.save(listKey, dto);
  }
}
