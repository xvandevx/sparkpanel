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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { InfoblockPropertiesService } from './properties.service';
import { InfoblockPropertyDto } from './property.dto';
import { UpdateInfoblockPropertyDto } from './update-property.dto';
import { ListEditGuard } from '../list-edit.guard';

/**
 * Свойства записей списка. Отдельные маршруты, а не часть настроек: свойства
 * читают и правят сами по себе — в карточке записи нужны они, а не имя и код
 * списка. Правится по одному: правка свойства не должна переписывать соседей.
 */
@ApiTags('infoblock-properties')
@ApiBearerAuth('JWT-auth')
@ApiParam({ name: 'listKey', example: 'pages', description: 'Ключ списка' })
// Пользователей и роли правит только root — см. гард
@UseGuards(ListEditGuard)
@Controller('infoblocks/settings/:listKey/properties')
export class InfoblockPropertiesController {
  constructor(private readonly propertiesService: InfoblockPropertiesService) {}

  @ApiOperation({ summary: 'Свойства записей списка' })
  @ApiOkResponse({ type: [InfoblockPropertyDto] })
  @Get()
  findAll(@Param('listKey') listKey: string): Promise<InfoblockPropertyDto[]> {
    return this.propertiesService.findAll(listKey);
  }

  @ApiOperation({ summary: 'Завести свойство' })
  @ApiOkResponse({ type: InfoblockPropertyDto })
  @ApiBadRequestResponse({ description: 'Нет кода или названия, список без вариантов, чужая вкладка' })
  @ApiConflictResponse({ description: 'Свойство с таким кодом уже есть' })
  @Post()
  create(
    @Param('listKey') listKey: string,
    @Body() dto: InfoblockPropertyDto,
  ): Promise<InfoblockPropertyDto> {
    return this.propertiesService.create(listKey, dto);
  }

  @ApiOperation({ summary: 'Изменить свойство' })
  @ApiOkResponse({ type: InfoblockPropertyDto })
  @ApiNotFoundResponse({ description: 'Свойство не найдено' })
  @ApiConflictResponse({ description: 'Свойство с таким кодом уже есть' })
  @Patch(':id')
  update(
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInfoblockPropertyDto,
  ): Promise<InfoblockPropertyDto> {
    return this.propertiesService.update(listKey, id, dto);
  }

  @ApiOperation({ summary: 'Удалить свойство вместе со значениями у записей' })
  @ApiNotFoundResponse({ description: 'Свойство не найдено' })
  @HttpCode(204)
  @Delete(':id')
  remove(
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.propertiesService.remove(listKey, id);
  }
}
