import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CONTENTS_LIST, contentItemsList } from '../infoblocks/contents/content-lists';
import { ContentsService } from '../infoblocks/contents/contents.service';
import type { ContentDto } from '../infoblocks/contents/dto/content.dto';
import { DomainsService } from '../infoblocks/domains/domains.service';
import { DraftsService } from '../infoblocks/drafts/drafts.service';
import { FilesService } from '../infoblocks/files/files.service';
import { PAGE_SIZES, pageRecords, type PageRow, type RecordValues } from '../infoblocks/records/records-page';
import { RecordsService } from '../infoblocks/records/records.service';
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
 * Записи списка, как их видит API: опубликованные, свойства — отдаваемые.
 * Значений здесь нет: их читают по надобности (`valuesOf`) — на отбор
 * свойства фильтра, на ответ — записи страницы. Все значения списка разом —
 * это секунды на тысячах товаров.
 */
interface Loaded {
  list: ApiList;
  rows: PageRow[];
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

/**
 * Свойства для общего отбора. Мультидоменных среди них нет: значения уже
 * взяты для одного домена (`apiValues`).
 */
const pageProperties = (properties: ApiPropertyDef[]) =>
  properties.map((property) => ({ id: property.id, type: property.type, isMultiDomain: false }));

/** Ключ сортировки по свойству: в строку записи кладётся его значение. */
const SORT_VALUE = '$sort';

/** Свойства, по которым отбирают: их значения нужны отбору. */
const filteredBy = (properties: ApiPropertyDef[], filters: ApiFilter[]): ApiPropertyDef[] =>
  properties.filter((property) => filters.some((item) => item.propertyId === property.id));

/** Привязки записей в значениях свойств — для названий привязанных записей. */
const linksOf = (rows: PageRow[], linkProps: ApiPropertyDef[], values: RecordValues): ContentLink[] =>
  rows.flatMap((row) =>
    linkProps.flatMap((property) => itemsOf(values.get(String(row.id))?.get(property.id)) as ContentLink[]),
  );

/**
 * Отобранные по привязкам в базе (`linkMatches`): записи, которые есть в наборе
 * каждого фильтра-привязки, кроме фильтра свойства `except` — его фасет свой
 * выбор не учитывает.
 */
const withLinks = (rows: PageRow[], matches: Map<number, Set<string>>, except: number | null = null): PageRow[] => {
  const sets = Array.from(matches).flatMap(([propertyId, set]) => (propertyId === except ? [] : [set]));
  return sets.length === 0 ? rows : rows.filter((row) => sets.every((set) => set.has(String(row.id))));
};

/**
 * Внешнее API, чтение: читает списки панели теми же сервисами, что и редактор
 * (записи — у `RecordsService`, свойства — у настроек, значения — у `values/`),
 * отбирает общим `pageRecords` и отдаёт в виде для сайта. Данные сайта
 * общие — ключ читает их все, чей бы он ни был. Запись — `write/`.
 */
@Injectable()
export class ExternalApiService {
  constructor(
    private readonly records: RecordsService,
    private readonly settings: InfoblockSettingsService,
    private readonly values: PropertyValuesService,
    private readonly drafts: DraftsService,
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

    let rows = loaded.rows;
    if (query.parentId !== undefined && list.fields.includes('parentId')) {
      const parent = query.parentId === 'root' ? null : query.parentId;
      rows = rows.filter((row) => (row.parentId ?? null) === null ? parent === null : String(row.parentId) === parent);
    }

    const sort = query.sort ?? 'sort';
    if (!sortKeys({ list, properties }).includes(sort)) throw new BadRequestException(`По «${sort}» не сортируют`);
    const property = properties.find((item) => item.code === sort);

    // Сначала — привязки, запросом к базе; значения отбору нужны только
    // у оставшихся записей и только свойств фильтра и сортировки
    rows = withLinks(rows, await this.linkMatches(loaded, filters));
    const values = await this.valuesOf(loaded, rows, [...filteredBy(properties, filters), ...(property ? [property] : [])]);
    if (property) {
      rows = rows.map((row) => ({ ...row, [SORT_VALUE]: values.get(String(row.id))?.get(property.id) ?? null }));
    }

    const pageSize = query.pageSize ?? PAGE_SIZES[0];
    const page = query.page ?? 1;
    const found = pageRecords(
      rows,
      {
        page,
        pageSize,
        search: query.search ?? '',
        searchIn: list.searchIn,
        sort: property ? SORT_VALUE : sort,
        isDescending: query.order === 'desc',
        isTree: false,
        filters: filters.map((item) => item.filter),
      },
      pageProperties(properties),
      values,
    );
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
    const row = loaded.rows.find((item) => String(item.id) === idOrCode || (item.code !== '' && item.code === idOrCode));
    return this.one(loaded, row, origin, expand);
  }

  /** Запись по внешнему ID: номер ищется по индексу, а не перебором списка. */
  async itemByExternalId(path: string, externalId: string, query: ExternalItemQueryDto, origin: string) {
    const list = await this.listAt(path);
    const recordId = await this.values.recordIdByExternalId(list.listKey, externalId.trim());
    if (recordId === null) throw new NotFoundException('Запись не найдена');
    const loaded = await this.load(list, query.domain);
    const expand = await this.expandOf(query.expand, loaded.properties);
    return this.one(loaded, loaded.rows.find((row) => String(row.id) === recordId), origin, expand);
  }

  /** Страница по полному адресу — то, что нужно роутеру сайта. Слэш в конце не важен. */
  async pageByUrl(url: string, domain: string | undefined, origin: string) {
    const loaded = await this.load(PAGES_API, domain);
    const wanted = trimSlash(url);
    return this.one(loaded, loaded.rows.find((row) => trimSlash(String(row.path ?? '')) === wanted), origin);
  }

  async domainByHost(host: string, origin: string) {
    const loaded = await this.load(DOMAINS_API, undefined);
    const wanted = host.trim().toLowerCase();
    return this.one(loaded, loaded.rows.find((row) => row.address === wanted), origin);
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
    const linkProps = facetProps.filter((item) => isLinkType(item.type));
    const matches = await this.linkMatches(loaded, filters);

    // У каждого фасета свои записи (без его фильтра) и свои значения: само
    // свойство и свойства остальных фильтров — у записей, прошедших привязки
    const counted = await Promise.all(
      facetProps.map(async (property) => {
        const others = filters.filter((item) => item.propertyId !== property.id);
        const rows = withLinks(loaded.rows, matches, property.id);
        const values = await this.valuesOf(loaded, rows, [property, ...filteredBy(properties, others)]);
        const { items } = pageRecords(
          rows,
          {
            page: 1,
            pageSize: Math.max(rows.length, 1),
            search: query.search ?? '',
            searchIn: list.searchIn,
            sort: null,
            isDescending: false,
            isTree: false,
            filters: others.map((item) => item.filter),
          },
          pageProperties(properties),
          values,
        );
        return { property, items, values };
      }),
    );
    const linkNames = await this.linkNamesOf(
      counted.flatMap(({ property, items, values }) => (isLinkType(property.type) ? linksOf(items, [property], values) : [])),
      linkProps,
    );
    return Object.fromEntries(
      counted.map(({ property, items, values }) => [property.code, facetOf(property, items, values, linkNames)]),
    );
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

  /**
   * Записи списка для сайта: только активные и хоть раз опубликованные —
   * запись, заведённую черновиком, на сайте ещё не видно. Значений не читает:
   * их берут по надобности (`valuesOf`) для домена `domain`.
   */
  private async load(list: ApiList, domain: string | undefined): Promise<Loaded> {
    const [rows, properties, drafts, domainId] = await Promise.all([
      this.records.rows(list.listKey),
      this.propertiesOf(list.listKey),
      this.drafts.findAll(list.listKey),
      this.domainIdOf(domain),
    ]);
    const unpublished = new Set(drafts.filter((draft) => draft.isNew).map((draft) => draft.recordId));
    return {
      list,
      rows: rows.filter((row) => row.isActive !== false && !unpublished.has(String(row.id))),
      properties,
      domain,
      domainId,
    };
  }

  /**
   * Значения записей `rows` — только свойств `properties`, как их видит API:
   * мультидоменные — для домена запроса. Записи — всегда часть списка,
   * поэтому столько же, сколько в списке, — это весь список: его читают без
   * перечня номеров.
   */
  private async valuesOf(
    { list, rows: all, domainId }: Loaded,
    rows: PageRow[],
    properties: ApiPropertyDef[],
  ): Promise<RecordValues> {
    const recordIds = rows.length === all.length ? null : rows.map((row) => String(row.id));
    const stored = await this.values.findSome(
      list.listKey,
      recordIds,
      properties.map((property) => property.id),
    );
    const byRecord: RecordValues = new Map(
      stored.map((record) => [record.recordId, new Map(record.values.map((item) => [item.propertyId, item.value]))]),
    );
    return apiValues(byRecord, properties, domainId);
  }

  /**
   * Фильтры-привязки — в наборы подходящих записей: номер свойства → ключи
   * записей. Запросом к базе по индексу значений привязки, а не перебором
   * значений списка. Это сужение, а не весь отбор: мультидоменное значение
   * чужого домена тоже проходит — точный отбор потом делает `pageRecords`.
   */
  private async linkMatches({ list, properties }: Loaded, filters: ApiFilter[]): Promise<Map<number, Set<string>>> {
    const sets = await Promise.all(
      filters.flatMap(({ propertyId, linkIds }) => {
        const property = properties.find((item) => item.id === propertyId);
        if (!property || linkIds === undefined) return [];
        const found = this.values.linkedRecordIds(list.listKey, propertyId, linkListOf(property), linkIds);
        return [found.then((set) => [propertyId, set] as const)];
      }),
    );
    return new Map(sets);
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
    const fileIds = Array.from(new Set(valuesOf([PropertyType.File, PropertyType.Image]).map(Number)));
    const [files, linkNames, expanded] = await Promise.all([
      this.files.findByIds(fileIds),
      this.linkNamesOf(linksOf(rows, linkProps, values), linkProps),
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
    const rows = loaded.rows.filter((row) => wanted.has(keyOf(row.id)));
    const values = await this.valuesOf(loaded, rows, loaded.properties);
    const context = await this.contextOf(loaded, rows, values, origin);
    return new Map(rows.map((row) => [keyOf(row.id), this.recordOf(loaded, row, values, context)]));
  }

  /**
   * Названия записей, к которым привязаны значения: `список/запись` → название.
   * Читаются списки-источники привязок `linkProps` и списки из самих `links`.
   */
  private async linkNamesOf(links: ContentLink[], linkProps: ApiPropertyDef[]): Promise<Map<string, string | null>> {
    const lists = Array.from(new Set([...links.map((link) => link.listKey), ...linkProps.map(linkListOf)])).filter(
      (key) => key !== '',
    );
    const names = new Map<string, string | null>();
    await Promise.all(
      lists.map(async (listKey) => {
        // Список, которого API не знает (раздел отложен), — без названий, но не ошибка
        const listRows = await this.records.rows(listKey).catch(() => [] as PageRow[]);
        listRows.forEach((row) =>
          names.set(linkKey({ listKey, recordId: String(row.id) }), typeof row.name === 'string' ? row.name : null),
        );
      }),
    );
    return names;
  }
}

const trimSlash = (url: string): string => {
  const path = url.trim().split('?')[0];
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
};
