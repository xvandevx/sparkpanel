import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsDto } from './dto/settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Настройки сайта текущего пользователя' })
  @ApiOkResponse({ type: SettingsDto })
  @Get()
  find(@Req() req: Request) {
    // userId — из токена, не из запроса: настройки всех пользователей в одной таблице
    return this.settingsService.find(req.user.id);
  }

  @ApiOperation({ summary: 'Изменить настройки сайта' })
  @ApiOkResponse({ type: SettingsDto })
  @ApiBadRequestResponse({ description: 'Домен указан неверно' })
  @Patch()
  update(@Req() req: Request, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(req.user.id, dto);
  }
}
