import { Body, Controller, Get, NotFoundException, Patch, Query, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/public.decorator';
import { contentDisposition } from '../infoblocks/files/file-disposition';
import { BrandDto } from './dto/brand.dto';
import { SettingsDto } from './dto/settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { LOGO_TYPES } from './logo';
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
  @ApiBadRequestResponse({
    description: 'Внешнее хранилище заполнено не до конца или не отвечает; логотип не той картинки',
  })
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }

  // Панель подписана логотипом и на экране входа — до токена, поэтому без него
  @ApiOperation({ summary: 'Название сайта и адрес логотипа панели, без входа' })
  @ApiOkResponse({ type: BrandDto })
  @Public()
  @Get('brand')
  brand() {
    return this.settingsService.brand();
  }

  /**
   * Картинка логотипа. Адрес с версией (`?v=` из `logoUrl`) кэшируется
   * навсегда — другая картинка будет по другому адресу; без версии браузер
   * переспрашивает каждый раз. SVG отдаётся вложением и под запретом скриптов:
   * открытый в адресной строке, он не выполнится как страница панели
   * (`<img>` рисует его всё равно).
   */
  @ApiOperation({ summary: 'Картинка логотипа панели, без входа' })
  @ApiProduces(...Object.keys(LOGO_TYPES))
  @ApiQuery({ name: 'v', required: false, description: 'Версия картинки из logoUrl' })
  @ApiNotFoundResponse({ description: 'Своего логотипа нет — панель рисует SparkPanel' })
  @Public()
  @Get('logo')
  async logo(@Query('v') version: string | undefined, @Res() res: Response) {
    const logo = await this.settingsService.logo();
    if (!logo) throw new NotFoundException('Своего логотипа нет');

    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader(
      'Content-Disposition',
      contentDisposition(logo.mimeType, `logo.${LOGO_TYPES[logo.mimeType] ?? 'img'}`),
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader(
      'Cache-Control',
      version === logo.version ? 'public, max-age=31536000, immutable' : 'no-cache',
    );
    res.send(logo.body);
  }
}
