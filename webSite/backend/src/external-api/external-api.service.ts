import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CONTENTS_LIST, contentItemsList } from '../infoblocks/contents/content-lists';
import { ContentsService } from '../infoblocks/contents/contents.service';
import type { ContentDto } from '../infoblocks/contents/dto/content.dto';
import { DomainsService } from '../infoblocks/domains/domains.service';
import { FilesService } from '../infoblocks/files/files.service';
import { PAGE_SIZES, type PageProperty, type PageRow, type RecordValues } from '../infoblocks/records/records-page';
import { RecordsService, type Selection } from '../infoblocks/records/records.service';
import { isLinkType, linkKey, PropertyType, type ContentLink } from '../infoblocks/settings/properties/property';
import { InfoblockSettingsService } from '../infoblocks/settings/settings.service';
import { PropertyValuesService } from '../infoblocks/values/property-values.service';
import { SettingsService } from '../settings/settings.service';
import { contentApiList, DOMAINS_API, FIXED_LISTS, PAGES_API, type ApiList } from './api-lists';
import { ExternalFacetsQueryDto, ExternalItemQueryDto, ExternalItemsQueryDto } from './dto/external-query.dto';
import {
  apiValue,
  apiValues,
  FACET_TYPES,
  facetOf,
  itemsOf,
  linkListOf,
  linkOfKey,
  parseApiFilters,
  parseExpand,
  type ApiFacet,
  type ApiFile,
  type ApiFilter,
  type ApiPropertyDef,
  type ValueContext,
} from './external-values';
import { buildSpec, sortKeys } from './openapi-spec';

/**
 * Список, как его видит API: свойства — отдаваемые, домен запроса. Записей
 * здесь нет: их отбирает `RecordsService` (у больших списков — запросом
 * к базе), значения читаются только у показываемых записей (`valuesOf`).
 */
interface Loaded {
  list: ApiList;
  properties: ApiPropertyDef[];
  /** Домен запроса: значения мультидоменных свойств и раскрытые привязки — для него */
  domain: string | undefined;
  domainId: number | null;
}

/** Тип контента, который видно в API: активный и с кодом — код входит в адрес. */
const isApiType = (type: ContentDto): boolean => type.isActive && type.code !== '';

/** Тип контента в ответе — в `GET /contents` и в раскрытой привязке к типу. */
const apiContentType = (type: ContentDto) => ({
  code: type.code,
  name: type.name,
  path: `/contents/${type.code}`,
  total: type.itemsCount,
});

/** Свойства для общего отбора: мультидоменные значения отбор берёт для домена запроса сам. */
const pageProperties = (properties: ApiPropertyDef[]): PageProperty[] =>
  properties.map((property) => ({
    id: property.id,
    type: property.type,
    isMultiDomain: property.isMultiDomain,
    multiple: property.multiple,
    linkList: linkListOf(property),
  }));

/** Привязки записей в значениях свойств — для названий привязанных записей. */
const linksOf = (rows: PageRow[], linkProps: ApiPropertyDef[], values: RecordValues): ContentLink[] =>
  rows.flatMap((row) =>
    linkProps.flatMap((property) => itemsOf(values.get(String(row.id))?.get(property.id)) as ContentLink[]),
  );

/**
 * Внешнее API, чтение: читает списки панели теми же сервисами, что и редактор
 * (записи — у `RecordsService`, свойства — у настроек, значения — у `values/`):
 * отбор, страница и фасеты — у `RecordsService`, по тем же правилам, что
 * таблица админки, а здесь — вид для сайта. Данные сайта
 * общие — ключ читает их все, чей бы он ни был. Запись — `write/`.
 */
@Injectable()
export class ExternalApiService {
  constructor(
    private readonly records: RecordsService,
    private readonly settings: InfoblockSettingsService,
    private readonly values: PropertyValuesService,
    private readonly contents: ContentsService,
    private readonly domains: DomainsService,
    private readonly files: FilesService,
    private readonly siteSettings: SettingsService,
  ) {}

  /** Все списки API: постоянные и по одному на активный тип контента. */
  async lists(): Promise<ApiList[]> {
    const types = await this.contents.findAll();
    const contentLists = types
      .filter(isApiType)
      .map((type) => contentApiList(contentItemsList(type.id), type.code, type.name));
    const [pages, ...rest] = FIXED_LISTS;
    return [pages, ...contentLists, ...rest];
  }

  async contentTypes() {
    return (await this.contents.findAll()).filter(isApiType).map(apiContentType);
  }

  async items(path: string, query: ExternalItemsQueryDto, origin: string) {
    const loaded = await this.load(await this.listAt(path), query.domain);
    const { list, properties } = loaded;
    const filters = parseApiFilters(query.filter, properties);
    const expand = await this.expandOf(query.expand, properties);

    const sort = query.sort ?? 'sort';
    if (!sortKeys({ list, properties }).includes(sort)) throw new BadRequestException(`По «${sort}» не сортируют`);
    const property = properties.find((item) => item.code === sort);

    const pageSize = query.pageSize ?? PAGE_SIZES[0];
    const page = query.page ?? 1;
    const found = await this.records.select(list.listKey, {
      ...this.selectionOf(loaded, query.search, filters),
      page,
      pageSize,
      sort: property ? { propertyId: property.id } : { field: sort },
      isDescending: query.order === 'desc',
      ...(query.parentId !== undefined && list.fields.includes('parentId')
        ? { parentId: query.parentId === 'root' ? null : query.parentId }
        : {}),
    });
    const shown = await this.valuesOf(loaded, found.items, properties);
    const context = await this.contextOf(loaded, found.items, shown, origin, expand);
    return {
      items: found.items.map((row) => this.recordOf(loaded, row, shown, context)),
      total: found.total,
      page,
      pageSize,
    };
  }

  async item(path: string, idOrCode: string, query: ExternalItemQueryDto, origin: string) {
    const loaded = await this.load(await this.listAt(path), query.domain);
    const expand = await this.expandOf(query.expand, loaded.properties);
    const [row] = await this.records.find(loaded.list.listKey, { idOrCode }, true);
    return this.one(loaded, row, origin, expand);
  }

  /** Запись по внешнему ID: номер ищется по индексу, а не перебором списка. */
  async itemByExternalId(path: string, externalId: string, query: ExternalItemQueryDto, origin: string) {
    const list = await this.listAt(path);
    const recordId = await this.values.recordIdByExternalId(list.listKey, externalId.trim());
    if (recordId === null) throw new NotFoundException('Запись не найдена');
    const loaded = await this.load(list, query.domain);
    const expand = await this.expandOf(query.expand, loaded.properties);
    const [row] = await this.records.find(list.listKey, { ids: [recordId] }, true);
    return this.one(loaded, row, origin, expand);
  }

  /** Страница по полному адресу — то, что нужно роутеру сайта. Слэш в конце не важен. */
  async pageByUrl(url: string, domain: string | undefined, origin: string) {
    const loaded = await this.load(PAGES_API, domain);
    const wanted = trimSlash(url);
    const rows = await this.records.siteRows(PAGES_API.listKey);
    return this.one(loaded, rows.find((row) => trimSlash(String(row.path ?? '')) === wanted), origin);
  }

  async domainByHost(host: string, origin: string) {
    const loaded = await this.load(DOMAINS_API, undefined);
    const wanted = host.trim().toLowerCase();
    const rows = await this.records.siteRows(DOMAINS_API.listKey);
    return this.one(loaded, rows.find((row) => row.address === wanted), origin);
  }

  async properties(path: string) {
    const list = await this.listAt(path);
    return (await this.propertiesOf(list.listKey)).map((property) => ({
      code: property.code,
      name: property.name,
      hint: property.hint,
      type: property.type,
      isMultiple: property.multiple,
      isMultiDomain: property.isMultiDomain,
      ...(property.type === PropertyType.List || property.type === PropertyType.ListOptionLink
        ? { options: property.options.map((option) => ({ value: option.code, label: option.name })) }
        : {}),
    }));
  }

  /**
   * Фасеты: по каждому свойству для фильтра — что в нём есть среди записей,
   * отобранных поиском и остальными полями фильтра. Свой выбор фасет не
   * учитывает — иначе в «Бренде» после выбора Bosch остался бы один Bosch.
   */
  async facets(path: string, query: ExternalFacetsQueryDto): Promise<Record<string, ApiFacet>> {
    const loaded = await this.load(await this.listAt(path), query.domain);
    const { list, properties } = loaded;
    const filters = parseApiFilters(query.filter, properties);
    const facetProps = properties.filter((property) => FACET_TYPES.has(property.type));
    // Фасеты свойств, по которым не отбирают, — по одним и тем же записям,
    // одним подсчётом; у свойства фильтра — свой, без его поля
    const isFiltered = (property: ApiPropertyDef) => filters.some((item) => item.propertyId === property.id);
    const tallies = await Promise.all([
      this.records.tallies(
        list.listKey,
        this.selectionOf(loaded, query.search, filters),
        pageProperties(facetProps.filter((property) => !isFiltered(property))),
      ),
      ...facetProps.filter(isFiltered).map((property) =>
        this.records.tallies(
          list.listKey,
          this.selectionOf(loaded, query.search, filters.filter((item) => item.propertyId !== property.id)),
          pageProperties([property]),
        ),
      ),
    ]);
    const byProperty = new Map(tallies.flatMap((tally) => Array.from(tally)));

    const links = facetProps
      .filter((property) => isLinkType(property.type))
      .flatMap((property) => Array.from(byProperty.get(property.id)?.counts.keys() ?? []).map(linkOfKey));
    const linkNames = await this.linkNamesOf(links);
    return Object.fromEntries(
      facetProps.map((property) => [
        property.code,
        facetOf(property, byProperty.get(property.id) ?? { counts: new Map(), min: null, max: null }, linkNames),
      ]),
    );
  }

  /** Отбор для `RecordsService`: поиск, фильтр и правила сайта; страница и порядок — у вызывающего. */
  private selectionOf({ list, properties, domainId }: Loaded, search: string | undefined, filters: ApiFilter[]): Selection {
    return {
      page: 1,
      pageSize: 0,
      search: search ?? '',
      searchIn: list.searchIn,
      filters: filters.map((item) => item.filter),
      properties: pageProperties(properties),
      sort: null,
      isDescending: false,
      site: { domainId },
    };
  }

  /** Спецификация OpenAPI по нынешним настройкам списков. */
  async spec(origin: string) {
    const lists = await this.lists();
    const [specLists, site] = await Promise.all([
      Promise.all(lists.map(async (list) => ({ list, properties: await this.propertiesOf(list.listKey) }))),
      this.siteSettings.find(),
    ]);
    return buildSpec({ serverUrl: `${origin}/api/v1`, siteName: site.siteName, lists: specLists });
  }

  /** Список API по адресу; нет такого — 404. */
  async listAt(path: string): Promise<ApiList> {
    const list = (await this.lists()).find((item) => item.path === path);
    if (!list) throw new NotFoundException(`Нет списка ${path}`);
    return list;
  }

  /** Отдаваемые свойства списка: не скрытые и уже сохранённые. */
  private async propertiesOf(listKey: string): Promise<ApiPropertyDef[]> {
    const { properties } = await this.settings.settingsOf(listKey);
    return properties.filter((property) => property.id !== undefined && !property.isHidden) as ApiPropertyDef[];
  }

  /** Список для сайта: отдаваемые свойства и домен запроса. */
  private async load(list: ApiList, domain: string | undefined): Promise<Loaded> {
    const [properties, domainId] = await Promise.all([this.propertiesOf(list.listKey), this.domainIdOf(domain)]);
    return { list, properties, domain, domainId };
  }

  /**
   * Значения записей `rows` — только свойств `properties`, как их видит API:
   * мультидоменные — для домена запроса.
   */
  private async valuesOf({ list, domainId }: Loaded, rows: PageRow[], properties: ApiPropertyDef[]): Promise<RecordValues> {
    const stored = await this.values.findSome(
      list.listKey,
      rows.map((row) => String(row.id)),
      properties.map((property) => property.id),
    );
    const byRecord: RecordValues = new Map(
      stored.map((record) => [record.recordId, new Map(record.values.map((item) => [item.propertyId, item.value]))]),
    );
    return apiValues(byRecord, properties, domainId);
  }

  private async domainIdOf(host: string | undefined): Promise<number | null> {
    if (host === undefined || host.trim() === '') return null;
    const wanted = host.trim().toLowerCase();
    const found = (await this.domains.findAll()).find((domain) => domain.address === wanted);
    if (!found) throw new BadRequestException(`Нет домена ${wanted}`);
    return found.id;
  }

  private async one(loaded: Loaded, row: PageRow | undefined, origin: string, expand: ApiPropertyDef[] = []) {
    if (!row) throw new NotFoundException('Запись не найдена');
    const values = await this.valuesOf(loaded, [row], loaded.properties);
    const context = await this.contextOf(loaded, [row], values, origin, expand);
    return this.recordOf(loaded, row, values, context);
  }

  /** `expand` запроса — в свойства: раскрывают привязки к спискам API и к типам контента. */
  private async expandOf(raw: string | undefined, properties: ApiPropertyDef[]): Promise<ApiPropertyDef[]> {
    if (raw === undefined || raw.trim() === '') return [];
    const targets = new Set([CONTENTS_LIST, ...(await this.lists()).map((list) => list.listKey)]);
    return parseExpand(raw, properties, targets);
  }

  private recordOf({ list, properties }: Loaded, row: PageRow, values: RecordValues, context: ValueContext) {
    const own = values.get(String(row.id));
    return {
      ...Object.fromEntries(list.fields.map((field) => [field, field === 'parentId' ? row.parentId ?? null : row[field]])),
      properties: Object.fromEntries(
        properties.map((property) => [property.code, apiValue(property, own?.get(property.id), context)]),
      ),
    };
  }

  /** Файлы, названия привязанных записей и раскрытые привязки — только для показываемых записей. */
  private async contextOf(
    loaded: Loaded,
    rows: PageRow[],
    values: RecordValues,
    origin: string,
    expand: ApiPropertyDef[] = [],
  ): Promise<ValueContext> {
    const { properties } = loaded;
    const linkProps = properties.filter((property) => isLinkType(property.type));
    const valuesOf = (types: PropertyType[]) =>
      rows.flatMap((row) =>
        properties
          .filter((property) => types.includes(property.type))
          .flatMap((property) => itemsOf(values.get(String(row.id))?.get(property.id))),
      );
    // Внешние файлы — адреса, читать их из «Файлов» нечего
    const fileIds = Array.from(
      new Set(valuesOf([PropertyType.File, PropertyType.Image]).filter((item) => typeof item === 'number')),
    ) as number[];
    const [files, linkNames, expanded] = await Promise.all([
      this.files.findByIds(fileIds),
      this.linkNamesOf(linksOf(rows, linkProps, values)),
      this.expandedOf(loaded, rows, values, expand, origin),
    ]);
    return {
      files: new Map(
        files.map((file): [number, ApiFile] => [
          file.id,
          {
            id: file.id,
            name: file.name,
            // Встроенное хранилище отдаёт адрес от корня сайта — сайту нужен полный
            url: file.url.startsWith('/') ? origin + file.url : file.url,
            mimeType: file.mimeType,
            size: file.size,
            isExternal: false,
          },
        ]),
      ),
      linkNames,
      expanded,
    };
  }

  /**
   * Раскрытые привязки: номер свойства → связанные записи по `список/запись`.
   * Связанные записи читаются пачкой — одним чтением на список, а не на
   * привязку, — и показываются так же, как в `items/{id}` их списка, для того
   * же домена. Глубина — один уровень: здесь `expand` уже не передаётся, и
   * привязки внутри раскрытой записи остаются `Link`.
   */
  private async expandedOf(
    { domain }: Loaded,
    rows: PageRow[],
    values: RecordValues,
    expand: ApiPropertyDef[],
    origin: string,
  ): Promise<Map<number, Map<string, unknown>>> {
    if (expand.length === 0) return new Map();
    const wanted = new Set(linksOf(rows, expand, values).map(linkKey));
    const listKeys = Array.from(new Set(expand.map(linkListOf)));
    const byList = new Map(
      await Promise.all(
        listKeys.map(async (listKey) => [listKey, await this.linkedRecords(listKey, wanted, domain, origin)] as const),
      ),
    );
    return new Map(expand.map((property) => [property.id, byList.get(linkListOf(property)) ?? new Map()]));
  }

  /**
   * Записи списка из `wanted` в виде для ответа, по `список/запись`. Записи,
   * которой API не отдаёт (удалена, выключена, не опубликована), здесь нет —
   * привязка к ней останется `Link`, как без `expand`.
   */
  private async linkedRecords(
    listKey: string,
    wanted: Set<string>,
    domain: string | undefined,
    origin: string,
  ): Promise<Map<string, unknown>> {
    const keyOf = (id: unknown) => linkKey({ listKey, recordId: String(id) });
    if (listKey === CONTENTS_LIST) {
      const types = (await this.contents.findAll()).filter((type) => isApiType(type) && wanted.has(keyOf(type.id)));
      return new Map(types.map((type) => [keyOf(type.id), apiContentType(type)]));
    }
    // Других списков здесь не бывает: `parseExpand` пропускает только списки API
    const list = (await this.lists()).find((item) => item.listKey === listKey) as ApiList;
    const loaded = await this.load(list, domain);
    const ids = Array.from(wanted).flatMap((key) => {
      const link = linkOfKey(key);
      return link.listKey === listKey ? [link.recordId] : [];
    });
    const rows = await this.records.find(listKey, { ids }, true);
    const values = await this.valuesOf(loaded, rows, loaded.properties);
    const context = await this.contextOf(loaded, rows, values, origin);
    return new Map(rows.map((row) => [keyOf(row.id), this.recordOf(loaded, row, values, context)]));
  }

  /**
   * Названия записей, к которым привязаны значения: `список/запись` → название.
   * Читаются только сами привязанные записи — по номерам, списком на список.
   */
  private async linkNamesOf(links: ContentLink[]): Promise<Map<string, string | null>> {
    const idsByList = new Map<string, Set<string>>();
    links.forEach((link) => {
      if (link.listKey === '') return;
      idsByList.set(link.listKey, (idsByList.get(link.listKey) ?? new Set()).add(link.recordId));
    });
    const names = new Map<string, string | null>();
    await Promise.all(
      Array.from(idsByList, async ([listKey, ids]) => {
        // Список, которого API не знает (раздел отложен), — без названий, но не ошибка
        const found = await this.records.names(listKey, Array.from(ids)).catch(() => new Map<string, string | null>());
        found.forEach((name, recordId) => names.set(linkKey({ listKey, recordId }), name));
      }),
    );
    return names;
  }
}

const trimSlash = (url: string): string => {
  const path = url.trim().split('?')[0];
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
};
