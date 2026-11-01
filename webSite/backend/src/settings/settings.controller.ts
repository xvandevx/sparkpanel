import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SettingsDto } from './dto/settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Настройки общие на сайт: владельца у них нет, но маршруты закрыты, как и все
  @ApiOperation({ summary: 'Настройки сайта' })
  @ApiOkResponse({ type: SettingsDto })
  @Get()
  find() {
    return this.settingsService.find();
  }

  @ApiOperation({ summary: 'Изменить настройки сайта: только присланное' })
  @ApiOkResponse({ type: SettingsDto })
  @ApiBadRequestResponse({ description: 'Внешнее хранилище заполнено не до конца или не отвечает' })
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
