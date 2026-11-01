import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SaveStorageDto, StorageDto, UpdateStorageDto } from './dto/storage.dto';
import { StoragesService } from './storages.service';

/**
 * Номер хранилища — только цифры: по тому же пути живут значения свойств
 * списка (`/infoblocks/storages/values`), и без этого «values» уходило бы
 * сюда номером.
 */
const ID = ':id(\\d+)';

/**
 * Внешние хранилища файлов — список редактора контента. Общие на сайт, как
 * и настройки: владельца нет, маршруты закрыты, как и все. Подключение —
 * значения свойств списка, оно правится их маршрутом.
 */
@ApiTags('infoblock-storages')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/storages')
export class StoragesController {
  constructor(private readonly storagesService: StoragesService) {}

  @ApiOperation({ summary: 'Внешние хранилища' })
  @ApiOkResponse({ type: [StorageDto] })
  @Get()
  findAll() {
    return this.storagesService.findAll();
  }

  @ApiOperation({ summary: 'Добавить хранилище; подключение — значениями свойств' })
  @ApiOkResponse({ type: StorageDto })
  @ApiBadRequestResponse({ description: 'Не заполнено название' })
  @Post()
  create(@Body() dto: SaveStorageDto) {
    return this.storagesService.create(dto);
  }

  @ApiOperation({ summary: 'Поправить хранилище: название, активность, сортировку' })
  @ApiOkResponse({ type: StorageDto })
  @ApiConflictResponse({ description: 'Выключают хранилище, выбранное для новых файлов' })
  @ApiNotFoundResponse({ description: 'Хранилище не найдено' })
  @Patch(ID)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStorageDto) {
    return this.storagesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Удалить свободное хранилище' })
  @ApiNotFoundResponse({ description: 'Хранилище не найдено' })
  @ApiConflictResponse({ description: 'Выбрано для новых файлов или в нём лежат файлы' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.storagesService.remove(id);
  }
}
