import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RootOnlyGuard } from '../../common';
import { originOf } from '../external-api.controller';
import { ExternalApiService } from '../external-api.service';
import { ApiKeyDto, ApiListDto, CreateApiKeyDto, CreatedApiKeyDto } from './api-key.dto';
import { ApiKeysService } from './api-keys.service';

/**
 * Внешнее API глазами панели — экран «Настройки → API»: ключи доступа
 * и спецификация для встроенной документации. Только главный администратор:
 * ключ открывает данные сайта.
 */
@ApiTags('external-api')
@ApiBearerAuth('JWT-auth')
@UseGuards(RootOnlyGuard)
@Controller('external-api')
export class ApiKeysController {
  constructor(
    private readonly keys: ApiKeysService,
    private readonly api: ExternalApiService,
  ) {}

  @ApiOperation({ summary: 'Ключи внешнего API, новые сверху' })
  @ApiOkResponse({ type: [ApiKeyDto] })
  @Get('keys')
  findKeys() {
    return this.keys.findAll();
  }

  @ApiOperation({ summary: 'Создать ключ. Ответ — единственный раз, когда ключ виден целиком' })
  @ApiOkResponse({ type: CreatedApiKeyDto })
  @Post('keys')
  async createKey(@Req() req: Request, @Body() dto: CreateApiKeyDto) {
    const lists = await this.api.lists();
    return this.keys.create(
      req.user.id,
      dto,
      lists.map((list) => list.listKey),
    );
  }

  @ApiOperation({ summary: 'Списки внешнего API — куда ключ может писать' })
  @ApiOkResponse({ type: [ApiListDto] })
  @Get('lists')
  async lists(): Promise<ApiListDto[]> {
    return (await this.api.lists()).map(({ listKey, name, group, path }) => ({ listKey, name, group, path }));
  }

  @ApiOperation({ summary: 'Отозвать ключ — он сразу перестаёт работать' })
  @ApiNotFoundResponse({ description: 'Ключа нет' })
  @Delete('keys/:id')
  removeKey(@Param('id', ParseIntPipe) id: number) {
    return this.keys.remove(id);
  }

  @ApiOperation({ summary: 'Спецификация внешнего API (OpenAPI 3.1) — та же, что по ключу из /api/v1/openapi.json' })
  @ApiOkResponse({ schema: { type: 'object', additionalProperties: true } })
  @Get('openapi')
  spec(@Req() req: Request) {
    return this.api.spec(originOf(req));
  }
}
