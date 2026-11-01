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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateInfoblockTabDto } from './create-tab.dto';
import { InfoblockTabDto } from './tab.dto';
import { InfoblockTabsService } from './tabs.service';
import { UpdateInfoblockTabDto } from './update-tab.dto';
import { ListEditGuard } from '../list-edit.guard';

/**
 * Вкладки карточки записи. Отдельные маршруты, а не часть настроек списка:
 * вкладку заводят и убирают по одной и сразу, а не копят в черновике вместе
 * со свойствами.
 */
@ApiTags('infoblock-tabs')
@ApiBearerAuth('JWT-auth')
@ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
// Пользователей и роли правит только root — см. гард
@UseGuards(ListEditGuard)
@Controller('infoblocks/settings/:listKey/tabs')
export class InfoblockTabsController {
  constructor(private readonly tabsService: InfoblockTabsService) {}

  @ApiOperation({ summary: 'Вкладки карточки записи' })
  @ApiOkResponse({ type: [InfoblockTabDto] })
  @Get()
  findAll(@Param('listKey') listKey: string): Promise<InfoblockTabDto[]> {
    return this.tabsService.findAll(listKey);
  }

  @ApiOperation({ summary: 'Завести вкладку' })
  @ApiOkResponse({ type: InfoblockTabDto })
  @ApiConflictResponse({ description: 'Вкладка с таким кодом уже есть' })
  @Post()
  create(
    @Param('listKey') listKey: string,
    @Body() dto: CreateInfoblockTabDto,
  ): Promise<InfoblockTabDto> {
    return this.tabsService.create(listKey, dto);
  }

  @ApiOperation({ summary: 'Переименовать вкладку' })
  @ApiOkResponse({ type: InfoblockTabDto })
  @ApiNotFoundResponse({ description: 'Вкладка не найдена' })
  @Patch(':id')
  rename(
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInfoblockTabDto,
  ): Promise<InfoblockTabDto> {
    return this.tabsService.rename(listKey, id, dto);
  }

  @ApiOperation({
    summary: 'Удалить вкладку; её свойства переходят на общую вкладку «Свойства»',
  })
  @ApiNotFoundResponse({ description: 'Вкладка не найдена' })
  @HttpCode(204)
  @Delete(':id')
  remove(
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.tabsService.remove(listKey, id);
  }
}
