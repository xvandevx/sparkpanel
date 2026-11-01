import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { historyAuthor } from '../history/history-author';
import { LinkSourceDto } from './links/link-source.dto';
import { LinkTargetDto } from './links/link-target.dto';
import { InfoblockSettingsDto } from './dto/settings.dto';
import { UpdateInfoblockSettingsDto } from './dto/update-settings.dto';
import { LinkTargetsService } from './links/link-targets.service';
import { OptionSourceDto } from './properties/option-source.dto';
import { InfoblockPropertiesService } from './properties/properties.service';
import { InfoblockSettingsService } from './settings.service';
import { ListEditGuard } from './list-edit.guard';

const LIST_KEY_PARAM = {
  name: 'listKey',
  example: 'infoblock-elements.3',
  description: 'Ключ списка: вид и, у вложенных списков, номер владельца',
};

@ApiTags('infoblock-settings')
@ApiBearerAuth('JWT-auth')
// Пользователей и роли правит только root — см. гард
@UseGuards(ListEditGuard)
@Controller('infoblocks/settings')
export class InfoblockSettingsController {
  constructor(
    private readonly settingsService: InfoblockSettingsService,
    private readonly linkTargets: LinkTargetsService,
    private readonly propertiesService: InfoblockPropertiesService,
  ) {}

  // Объявлено до `:listKey`: иначе Nest принял бы «link-targets» за ключ списка.
  @ApiOperation({
    summary: 'Записи для привязок — только из указанных списков',
  })
  @ApiQuery({
    name: 'listKeys',
    required: false,
    example: 'pages,content-items.8',
    description: 'Ключи списков через запятую; не указаны — ответ пустой',
  })
  @ApiOkResponse({ type: [LinkTargetDto] })
  @Get('link-targets')
  findLinkTargets(@Query('listKeys') listKeys?: string) {
    const keys = String(listKeys ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key !== '');
    return this.linkTargets.findAll(keys);
  }

  @ApiOperation({
    summary: 'Списки-источники привязки: страницы, типы контента, роли, товары и категории',
  })
  @ApiOkResponse({ type: [LinkSourceDto] })
  @Get('link-sources')
  findLinkSources() {
    return this.linkTargets.findSources();
  }

  @ApiOperation({
    summary: 'Свойства-«Списки» всех доступных списков: на их варианты смотрит привязка к значениям списка',
  })
  @ApiOkResponse({ type: [OptionSourceDto] })
  @Get('option-sources')
  findOptionSources() {
    return this.propertiesService.findOptionSources();
  }

  @ApiOperation({ summary: 'Настройки списка: имя, код и свойства записей' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiOkResponse({ type: InfoblockSettingsDto })
  @ApiBadRequestResponse({ description: 'Неизвестный список' })
  @Get(':listKey')
  findOne(@Param('listKey') listKey: string) {
    return this.settingsService.findOne(listKey);
  }

  @ApiOperation({ summary: 'Сохранить настройки списка целиком' })
  @ApiParam(LIST_KEY_PARAM)
  @ApiOkResponse({ type: InfoblockSettingsDto })
  @ApiBadRequestResponse({ description: 'Неизвестный список или свойства описаны с ошибкой' })
  @ApiConflictResponse({ description: 'Список с таким кодом уже есть' })
  @Put(':listKey')
  save(@Param('listKey') listKey: string, @Body() dto: UpdateInfoblockSettingsDto) {
    return this.settingsService.save(listKey, dto);
  }
}
