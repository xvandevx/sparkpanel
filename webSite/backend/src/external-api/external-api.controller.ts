import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../common';
import {
  DomainByHostQueryDto,
  ExternalFacetsQueryDto,
  ExternalItemQueryDto,
  ExternalItemsQueryDto,
  PageByUrlQueryDto,
} from './dto/external-query.dto';
import { ExternalBatchDto, ExternalWriteDto } from './dto/external-write.dto';
import { ExternalApiService } from './external-api.service';
import { ApiKeyGuard } from './keys/api-key.guard';
import type { ApiKeyOwner } from './keys/api-keys.service';
import { ExternalWriteService } from './write/external-write.service';

/**
 * Внешний адрес панели: из него — полные адреса файлов и `servers` спецификации.
 * Задан `PUBLIC_URL` — он; иначе адрес, с которого пришёл запрос (прокси перед
 * панелью должен передать `Host` и `X-Forwarded-Proto`).
 */
export const originOf = (req: Request): string => {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  const proto = (req.header('x-forwarded-proto') ?? req.protocol).split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
};

/** Адрес списка из сегментов маршрута: `/pages`, `/catalog/products`, `/contents/news`. */
const pathOf = (...segments: (string | undefined)[]): string =>
  '/' + segments.filter((segment) => segment !== undefined).join('/');

/** Ключ запроса — его положил `ApiKeyGuard`, без него сюда не попасть. */
const keyOf = (req: Request): ApiKeyOwner => req.apiKey as ApiKeyOwner;

/**
 * Внешнее API (`/api/v1`) — по ключу `X-Api-Key` вместо JWT. Читает любой
 * ключ, пишет — ключ с правом записи и только в разрешённые ему списки
 * (проверяет `ExternalWriteService`). У каждого списка одни и те же методы;
 * список — первые один-два сегмента адреса. Маршруты `items/external/…`
 * и запись по коду объявлены раньше двухсегментных: иначе запись с кодом
 * `items` ушла бы не туда.
 *
 * В Swagger панели не входит: внешнее API описывает своя спецификация,
 * собранная из настроек списков, — `GET /api/v1/openapi.json`.
 */
@ApiExcludeController()
@Public()
@UseGuards(ApiKeyGuard)
@Controller('v1')
export class ExternalApiController {
  constructor(
    private readonly api: ExternalApiService,
    private readonly write: ExternalWriteService,
  ) {}

  @Get('openapi.json')
  spec(@Req() req: Request) {
    return this.api.spec(originOf(req));
  }

  @Get('contents')
  contentTypes() {
    return this.api.contentTypes();
  }

  @Get('pages/by-url')
  pageByUrl(@Req() req: Request, @Query() query: PageByUrlQueryDto) {
    return this.api.pageByUrl(query.url, query.domain, originOf(req));
  }

  @Get('domains/by-host')
  domainByHost(@Req() req: Request, @Query() query: DomainByHostQueryDto) {
    return this.api.domainByHost(query.host, originOf(req));
  }

  @Get(':a/items/external/:externalId')
  itemByExternalId(
    @Req() req: Request,
    @Param('a') a: string,
    @Param('externalId') externalId: string,
    @Query() query: ExternalItemQueryDto,
  ) {
    return this.api.itemByExternalId(pathOf(a), externalId, query, originOf(req));
  }

  @Get(':a/:b/items/external/:externalId')
  nestedItemByExternalId(
    @Req() req: Request,
    @Param('a') a: string,
    @Param('b') b: string,
    @Param('externalId') externalId: string,
    @Query() query: ExternalItemQueryDto,
  ) {
    return this.api.itemByExternalId(pathOf(a, b), externalId, query, originOf(req));
  }

  @Get(':a/items/:idOrCode')
  item(@Req() req: Request, @Param('a') a: string, @Param('idOrCode') idOrCode: string, @Query() query: ExternalItemQueryDto) {
    return this.api.item(pathOf(a), idOrCode, query, originOf(req));
  }

  @Get(':a/:b/items/:idOrCode')
  nestedItem(
    @Req() req: Request,
    @Param('a') a: string,
    @Param('b') b: string,
    @Param('idOrCode') idOrCode: string,
    @Query() query: ExternalItemQueryDto,
  ) {
    return this.api.item(pathOf(a, b), idOrCode, query, originOf(req));
  }

  @Get(':a/items')
  items(@Req() req: Request, @Param('a') a: string, @Query() query: ExternalItemsQueryDto) {
    return this.api.items(pathOf(a), query, originOf(req));
  }

  @Get(':a/:b/items')
  nestedItems(@Req() req: Request, @Param('a') a: string, @Param('b') b: string, @Query() query: ExternalItemsQueryDto) {
    return this.api.items(pathOf(a, b), query, originOf(req));
  }

  @Get(':a/properties')
  properties(@Param('a') a: string) {
    return this.api.properties(pathOf(a));
  }

  @Get(':a/:b/properties')
  nestedProperties(@Param('a') a: string, @Param('b') b: string) {
    return this.api.properties(pathOf(a, b));
  }

  @Get(':a/facets')
  facets(@Param('a') a: string, @Query() query: ExternalFacetsQueryDto) {
    return this.api.facets(pathOf(a), query);
  }

  @Get(':a/:b/facets')
  nestedFacets(@Param('a') a: string, @Param('b') b: string, @Query() query: ExternalFacetsQueryDto) {
    return this.api.facets(pathOf(a, b), query);
  }

  /* --- запись: ключ с правом записи --- */

  @Post(':a/items/batch')
  @HttpCode(200)
  batch(@Req() req: Request, @Param('a') a: string, @Body() dto: ExternalBatchDto) {
    return this.write.batch(keyOf(req), pathOf(a), dto.items);
  }

  @Post(':a/:b/items/batch')
  @HttpCode(200)
  nestedBatch(@Req() req: Request, @Param('a') a: string, @Param('b') b: string, @Body() dto: ExternalBatchDto) {
    return this.write.batch(keyOf(req), pathOf(a, b), dto.items);
  }

  @Post(':a/items')
  create(@Req() req: Request, @Param('a') a: string, @Body() dto: ExternalWriteDto) {
    return this.write.create(keyOf(req), pathOf(a), dto);
  }

  @Post(':a/:b/items')
  nestedCreate(@Req() req: Request, @Param('a') a: string, @Param('b') b: string, @Body() dto: ExternalWriteDto) {
    return this.write.create(keyOf(req), pathOf(a, b), dto);
  }

  @Put(':a/items/external/:externalId')
  upsert(@Req() req: Request, @Param('a') a: string, @Param('externalId') externalId: string, @Body() dto: ExternalWriteDto) {
    return this.write.upsert(keyOf(req), pathOf(a), externalId, dto);
  }

  @Put(':a/:b/items/external/:externalId')
  nestedUpsert(
    @Req() req: Request,
    @Param('a') a: string,
    @Param('b') b: string,
    @Param('externalId') externalId: string,
    @Body() dto: ExternalWriteDto,
  ) {
    return this.write.upsert(keyOf(req), pathOf(a, b), externalId, dto);
  }

  @Patch(':a/items/:idOrCode')
  update(@Req() req: Request, @Param('a') a: string, @Param('idOrCode') idOrCode: string, @Body() dto: ExternalWriteDto) {
    return this.write.update(keyOf(req), pathOf(a), idOrCode, dto);
  }

  @Patch(':a/:b/items/:idOrCode')
  nestedUpdate(
    @Req() req: Request,
    @Param('a') a: string,
    @Param('b') b: string,
    @Param('idOrCode') idOrCode: string,
    @Body() dto: ExternalWriteDto,
  ) {
    return this.write.update(keyOf(req), pathOf(a, b), idOrCode, dto);
  }

  @Delete(':a/items/external/:externalId')
  @HttpCode(204)
  removeByExternalId(@Req() req: Request, @Param('a') a: string, @Param('externalId') externalId: string) {
    return this.write.removeByExternalId(keyOf(req), pathOf(a), externalId);
  }

  @Delete(':a/:b/items/external/:externalId')
  @HttpCode(204)
  nestedRemoveByExternalId(
    @Req() req: Request,
    @Param('a') a: string,
    @Param('b') b: string,
    @Param('externalId') externalId: string,
  ) {
    return this.write.removeByExternalId(keyOf(req), pathOf(a, b), externalId);
  }

  @Delete(':a/items/:idOrCode')
  @HttpCode(204)
  remove(@Req() req: Request, @Param('a') a: string, @Param('idOrCode') idOrCode: string) {
    return this.write.remove(keyOf(req), pathOf(a), idOrCode);
  }

  @Delete(':a/:b/items/:idOrCode')
  @HttpCode(204)
  nestedRemove(@Req() req: Request, @Param('a') a: string, @Param('b') b: string, @Param('idOrCode') idOrCode: string) {
    return this.write.remove(keyOf(req), pathOf(a, b), idOrCode);
  }
}
