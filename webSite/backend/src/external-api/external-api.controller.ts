import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
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
import { ExternalApiService } from './external-api.service';
import { ApiKeyGuard } from './keys/api-key.guard';

/** Адрес сайта, с которого пришёл запрос: из него — полные адреса файлов и `servers` спецификации. */
export const originOf = (req: Request): string => {
  const proto = (req.header('x-forwarded-proto') ?? req.protocol).split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
};

/** Адрес списка из сегментов маршрута: `/pages`, `/catalog/products`, `/contents/news`. */
const pathOf = (...segments: (string | undefined)[]): string =>
  '/' + segments.filter((segment) => segment !== undefined).join('/');

/**
 * Внешнее API (`/api/v1`) — только чтение, по ключу `X-Api-Key` вместо JWT.
 * У каждого списка одни и те же методы; список — первые один-два сегмента
 * адреса. Маршрут записи по коду объявлен раньше двухсегментных: иначе запись
 * с кодом `items` ушла бы не туда.
 *
 * В Swagger панели не входит: внешнее API описывает своя спецификация,
 * собранная из настроек списков, — `GET /api/v1/openapi.json`.
 */
@ApiExcludeController()
@Public()
@UseGuards(ApiKeyGuard)
@Controller('v1')
export class ExternalApiController {
  constructor(private readonly api: ExternalApiService) {}

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
}
