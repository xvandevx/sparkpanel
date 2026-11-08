import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { UserDto } from '../../users/dto/user.dto';
import { UsersService } from '../../users/users.service';
import { CONTENT_ITEMS_KIND, CONTENTS_LIST } from '../contents/content-lists';
import { ContentsService } from '../contents/contents.service';
import { ContentItemDto } from '../contents/items/dto/content-item.dto';
import type { ContentItems } from '../contents/items/content-items.model';
import { ContentItemsService } from '../contents/items/content-items.service';
import { DomainsService } from '../domains/domains.service';
import type { RecordDraftDto } from '../drafts/dto/record-draft.dto';
import { DraftsService } from '../drafts/drafts.service';
import { PROPERTY_FILES_KIND } from '../files/file-lists';
import { FilesService } from '../files/files.service';
import { FileSectionsService } from '../files/sections/file-sections.service';
import { FORM_FIELDS_LIST, FORMS_LIST } from '../forms/form-lists';
import { FormFieldsService } from '../forms/fields/form-fields.service';
import { FormsService } from '../forms/forms.service';
import { PagesService } from '../pages/pages.service';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../products/product-lists';
import type { ProductCategories } from '../products/categories/product-categories.model';
import { ProductCategoryDto } from '../products/categories/dto/product-category.dto';
import { ProductCategoriesService } from '../products/categories/product-categories.service';
import { ProductDto } from '../products/dto/product.dto';
import type { Products } from '../products/products.model';
import { ProductsService } from '../products/products.service';
import { RolesService } from '../roles/roles.service';
import { resolveInfoblock } from '../settings/infoblock-kinds';
import { isLinkType, PropertyType } from '../settings/properties/property';
import type { InfoblockPropertyDto } from '../settings/properties/property.dto';
import { InfoblockSettingsService } from '../settings/settings.service';
import { StoragesService } from '../storages/storages.service';
import type { PropertyValuesDto } from '../values/property-values.dto';
import { PropertyValuesService } from '../values/property-values.service';
import { RecordsPageQueryDto } from './dto/records-page-query.dto';
import { RecordsPageDto } from './dto/records-page.dto';
import {
  domainValue,
  PAGE_SIZES,
  pageRecords,
  parseFilters,
  tallyOf,
  withDrafts,
  withEditedAt,
  type PageProperty,
  type PageQuery,
  type PageRow,
  type RecordFilter,
  type RecordsPage,
  type RecordValues,
  type ValueTally,
} from './records-page';
import {
  selectionSql,
  sqlDraftsOf,
  tallySql,
  type SqlDrafts,
  type SqlParts,
  type SqlSelection,
  type SqlTable,
} from './records-sql';

/**
 * Записи списка: кто их отдаёт. `owner` — номер владельца у вложенного списка
 * (`content-items.3` → тип 3, `files.10` → раздел 10), у остальных null.
 */
type RecordsLoader = (owner: number) => Promise<PageRow[]>;

/**
 * Список, который отбирается запросом к базе (`records-sql.ts`): его таблица
 * и как её строки становятся записями раздела. `decorate` — вычисляемые поля
 * таблицы админки (`isBlocked`): сайту они не нужны.
 */
interface SqlSource extends SqlTable {
  rowsOf: (rows: Record<string, unknown>[]) => PageRow[];
  decorate?: (rows: Record<string, unknown>[], dtos: PageRow[]) => Promise<PageRow[]>;
}

/**
 * Что отбирают у списка — одним описанием для таблицы админки и внешнего API.
 * Поля фильтра — те же `RecordFilter`, что у `pageRecords`.
 */
export interface Selection {
  page: number;
  pageSize: number;
  search: string;
  searchIn: string[];
  filters: RecordFilter[];
  /** Свойства списка — что о них нужно отбору */
  properties: PageProperty[];
  /** Поле записи или свойство; null — без сортировки */
  sort: { field: string } | { propertyId: number } | null;
  isDescending: boolean;
  /** Сайт: только активные и опубликованные, мультидоменные значения — для домена */
  site?: { domainId: number | null };
  /** Родитель: null — верхний уровень; не задан — любой */
  parentId?: string | null;
}

/** Ключ сортировки по свойству у отбора в памяти: в строку записи кладётся его значение. */
const SORT_VALUE = '$sort';

/** Порядок строк так, как отдаёт раздел: `findAll` всех трёх таблиц. */
const SECTION_ORDER = 's.sort ASC, s.name ASC, s.id ASC';

/** Свойства для отбора: номер, тип и то, что нужно базе. */
export const pageProperties = (properties: InfoblockPropertyDto[]): PageProperty[] =>
  properties.flatMap((property) =>
    property.id === undefined
      ? []
      : [
          {
            id: property.id,
            type: property.type,
            isMultiDomain: property.isMultiDomain,
            multiple: property.multiple,
            linkList: property.type === PropertyType.ContentTypeLink ? CONTENTS_LIST : property.linkList,
          },
        ],
  );

/**
 * Страница записей любого списка редактора контента — для таблицы, и отбор
 * записей для внешнего API.
 *
 * Большие списки (товары, категории, элементы типов контента) отбираются
 * запросом к базе: поиск, фильтр, сортировка и страница — `WHERE` / `ORDER BY`
 * / `LIMIT` (`records-sql.ts`), из базы приходят только записи страницы.
 * Остальные — небольшие и с полями, которых в таблице нет (адрес страницы,
 * адрес домена, файл с хранилищем), — по-прежнему: записи берутся у сервиса
 * своего раздела теми же правилами, что и его `GET`, а отбирает общий
 * `pageRecords`. Правила у обоих путей одни.
 *
 * Отдельным модулем, а не в модуле настроек или значений: ему нужны сервисы
 * всех разделов, а разделы сами импортируют те модули — вышло бы кольцо.
 * Этот модуль не импортирует никто.
 */
@Injectable()
export class RecordsService {
  /** Ключ вида списка → его записи. Нового раздела здесь нет — его страница 400. */
  private readonly loaders: Record<string, RecordsLoader>;
  /** Виды списков, которые отбираются запросом к базе */
  private readonly sources: Record<string, SqlSource>;
  private collationCheck: Promise<string> | null = null;

  constructor(
    pages: PagesService,
    users: UsersService,
    roles: RolesService,
    products: ProductsService,
    categories: ProductCategoriesService,
    forms: FormsService,
    formFields: FormFieldsService,
    contents: ContentsService,
    contentItems: ContentItemsService,
    fileSections: FileSectionsService,
    files: FilesService,
    storages: StoragesService,
    domains: DomainsService,
    private readonly settings: InfoblockSettingsService,
    private readonly values: PropertyValuesService,
    private readonly drafts: DraftsService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {
    const rows = <T>(items: T[]): PageRow[] => items as unknown as PageRow[];
    this.loaders = {
      pages: async () => rows(await pages.findAll()),
      users: async () => rows((await users.findAll()).map(UserDto.from)),
      roles: async () => rows(await roles.findAll()),
      [PRODUCTS_LIST]: async () => rows(await products.findAll()),
      [CATEGORIES_LIST]: async () => rows(await categories.findAll()),
      [FORMS_LIST]: async () => rows(await forms.findAll()),
      [FORM_FIELDS_LIST]: async () => rows(await formFields.findAll()),
      [CONTENTS_LIST]: async () => rows(await contents.findAll()),
      [CONTENT_ITEMS_KIND]: async (contentId) => rows(await contentItems.findAll(contentId)),
      'file-sections': async () => rows(await fileSections.findAll()),
      files: async (sectionId) => rows(await files.findAll({ sectionId })),
      [PROPERTY_FILES_KIND]: async (propertyId) => rows(await files.findAll({ propertyId })),
      storages: async () => rows(await storages.findAll()),
      domains: async () => rows(await domains.findAll()),
    };
    this.sources = {
      [PRODUCTS_LIST]: {
        table: 'infoblock_products',
        hasParent: false,
        rowsOf: (items) => rows(items.map((item) => ProductDto.from(item as unknown as Products))),
      },
      [CATEGORIES_LIST]: {
        table: 'infoblock_products_categories',
        hasParent: true,
        // Отметку «привязана» ставит `decorate`: сайту она не нужна, а считается по всем значениям
        rowsOf: (items) => rows(items.map((item) => ProductCategoryDto.from(item as unknown as ProductCategories, false))),
        decorate: async (items) => rows(await categories.fromRows(items as unknown as ProductCategories[])),
      },
      [CONTENT_ITEMS_KIND]: {
        table: 'infoblock_contents_items',
        owner: 'contentId',
        hasParent: true,
        rowsOf: (items) => rows(items.map((item) => ContentItemDto.from(item as unknown as ContentItems))),
      },
    };
  }

  /**
   * Записи списка, как их отдаёт раздел, — с его вычисляемыми полями
   * (`isBlocked`): резервным копиям, чтобы не удалить защищённую запись.
   * Плюс внешний ID: он есть у записи любого списка, но живёт не в таблице
   * раздела, а в строке записи у `values/`.
   */
  async rows(listKey: string): Promise<PageRow[]> {
    const { key, kind } = resolveInfoblock(listKey);
    const load = this.loaders[kind];
    if (!load) throw new BadRequestException(`У списка ${key} нет страницы записей`);
    const [rows, externalIds] = await Promise.all([
      load(Number(key.split('.')[1] ?? 0)),
      this.values.externalIds(key),
    ]);
    return rows.map((row) => ({ ...row, externalId: externalIds.get(String(row.id)) ?? null }));
  }

  /**
   * Записи списка, которые видит сайт: активные и хоть раз опубликованные —
   * запись, заведённую черновиком, на сайте ещё не видно. Целиком — для
   * небольших списков (страница по адресу, домен по имени).
   */
  async siteRows(listKey: string): Promise<PageRow[]> {
    const [rows, drafts] = await Promise.all([this.rows(listKey), this.drafts.findAll(listKey)]);
    const unpublished = new Set(drafts.filter((draft) => draft.isNew).map((draft) => draft.recordId));
    return rows.filter((row) => row.isActive !== false && !unpublished.has(String(row.id)));
  }

  /** Отбор записей: страница и сколько всего. Записи — в том виде, в каком их отдаёт раздел. */
  async select(listKey: string, selection: Selection): Promise<RecordsPage<PageRow>> {
    const { key, kind } = resolveInfoblock(listKey);
    const source = this.sources[kind];
    if (!source) return this.selectInMemory(key, selection);

    const { raw, total } = await this.pageWithTotal(
      selectionSql(await this.sqlSelection(key, source, selection)),
      `s.*, r."externalId" AS "$externalId"`,
      selection.page,
      selection.pageSize,
    );
    return { items: this.sqlRows(source, raw), total };
  }

  /**
   * Подсчёт значений свойств `facets` у записей, отобранных `selection`
   * (страница не важна): номер свойства → что в его значениях и сколько раз.
   * У большого списка — одним запросом с `GROUP BY`.
   */
  async tallies(listKey: string, selection: Selection, facets: PageProperty[]): Promise<Map<number, ValueTally>> {
    const result = new Map(facets.map((property): [number, ValueTally] => [property.id, { counts: new Map(), min: null, max: null }]));
    if (facets.length === 0) return result;
    const { key, kind } = resolveInfoblock(listKey);
    const source = this.sources[kind];

    if (!source) {
      const rows = await this.matchedInMemory(key, selection);
      const values = await this.valuesInMemory(key, facets, selection.site);
      // Значения уже для домена — подсчёт видит их как обычные
      facets.forEach((property) => result.set(property.id, tallyOf({ ...property, isMultiDomain: false }, rows, values)));
      return result;
    }

    const { sql, replacements } = tallySql(await this.sqlSelection(key, source, selection), facets);
    const rows = await this.query(sql, replacements);
    const byId = new Map(facets.map((property) => [property.id, property]));
    for (const row of rows) {
      const property = byId.get(Number(row.propertyId)) as PageProperty;
      const tally = result.get(property.id) as ValueTally;
      if (property.type === PropertyType.Number) {
        tally.min = row.min === null ? null : Number(row.min);
        tally.max = row.max === null ? null : Number(row.max);
      } else if (row.key !== null) {
        const value = isLinkType(property.type as PropertyType) ? `${property.linkList}/${row.key}` : String(row.key);
        tally.counts.set(value, Number(row.count));
      }
    }
    return result;
  }

  /**
   * Записи по номерам или одна по номеру либо коду — без чтения списка у
   * большого. `isSite` — только те, что видит сайт. Порядок — как у раздела.
   */
  async find(
    listKey: string,
    wanted: { ids: string[] } | { idOrCode: string },
    isSite: boolean,
  ): Promise<PageRow[]> {
    const { key, kind } = resolveInfoblock(listKey);
    const source = this.sources[kind];
    const matches = (row: PageRow) =>
      'ids' in wanted
        ? wanted.ids.includes(String(row.id))
        : String(row.id) === wanted.idOrCode || (row.code !== '' && row.code === wanted.idOrCode);
    if (!source) return (isSite ? await this.siteRows(key) : await this.rows(key)).filter(matches);
    if ('ids' in wanted && wanted.ids.length === 0) return [];

    const parts = selectionSql(
      await this.sqlSelection(key, source, {
        page: 1,
        pageSize: 0,
        search: '',
        searchIn: [],
        filters: [],
        properties: [],
        sort: null,
        isDescending: false,
        ...(isSite ? { site: { domainId: null } } : {}),
      }),
    );
    // Номер — числом: по первичному ключу, а не перебором строк таблицы
    const numbers = ('ids' in wanted ? wanted.ids : [wanted.idOrCode]).filter((id) => /^(0|[1-9][0-9]{0,8})$/.test(id)).map(Number);
    if ('ids' in wanted && numbers.length === 0) return [];
    const condition =
      'ids' in wanted
        ? `s.id IN (:wantedIds)`
        : `(${numbers.length > 0 ? 's.id = :wantedNumber OR ' : ''}(s.code <> '' AND s.code = :wantedCode))`;
    const raw = await this.query(
      `SELECT s.*, r."externalId" AS "$externalId" FROM ${parts.from} WHERE ${parts.where} AND ${condition}` +
        ` ORDER BY ${SECTION_ORDER}${'ids' in wanted ? '' : ' LIMIT 1'}`,
      {
        ...parts.replacements,
        wantedIds: numbers,
        wantedNumber: numbers[0] ?? 0,
        wantedCode: 'idOrCode' in wanted ? wanted.idOrCode : '',
      },
    );
    return this.sqlRows(source, raw);
  }

  /**
   * Названия записей по номерам: номер → название. Привязкам, которые
   * показывают, на что ссылаются, — без чтения всего списка-источника.
   */
  async names(listKey: string, ids: string[]): Promise<Map<string, string | null>> {
    const rows = await this.find(listKey, { ids }, false);
    return new Map(rows.map((row) => [String(row.id), typeof row.name === 'string' ? row.name : null]));
  }

  /** Страница записей для таблицы админки: поиск и сортировка — с черновиками поверх. */
  async page(listKey: string, query: RecordsPageQueryDto): Promise<RecordsPageDto> {
    const { key, kind } = resolveInfoblock(listKey);
    const filters = parseFilters(query.filters);
    const [{ properties }, drafts] = await Promise.all([this.settings.settingsOf(key), this.drafts.findAll(key)]);
    const pageQuery: PageQuery = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? PAGE_SIZES[0],
      search: query.search ?? '',
      searchIn: query.searchIn ?? [],
      // Без сортировки — по полю «Сортировка», как и в таблице по умолчанию;
      // равные (и все записи списка без этого поля) — новые сверху
      sort: query.sort ?? 'sort',
      isDescending: query.order === 'desc',
      // Черновики — плоским списком: у отобранных родитель часто без черновика
      isTree: query.isTree === true && query.isDraft !== true,
      filters,
    };
    const props = pageProperties(properties);
    const allPropIds = props.map((property) => property.id);
    const source = this.sources[kind];

    let page: RecordsPage<PageRow>;
    if (!source) {
      const [loaded, stored, editedAt] = await Promise.all([this.rows(key), this.values.findAll(key), this.values.editedAt(key)]);
      page = pageInMemory(withEditedAt(loaded, editedAt), stored, drafts, pageQuery, props, query.isDraft === true);
    } else if (query.isDraft === true) {
      // Только записи с черновиком — их немного: отбор в памяти
      const ids = drafts.map((draft) => draft.recordId);
      const [loaded, stored] = await Promise.all([this.adminRows(key, source, ids), this.values.findSome(key, ids, allPropIds)]);
      page = pageInMemory(loaded, stored, drafts, pageQuery, props, true);
    } else {
      page = await this.pageInSql(key, source, pageQuery, props, drafts);
    }

    // Значения — только записей страницы: ими живут её ячейки свойств
    // и карточка записи, открытой из таблицы
    const shownIds = page.items.map((item) => String(item.id));
    const shown = new Set(shownIds);
    const stored = await this.values.findSome(key, shownIds, allPropIds);
    return {
      ...page,
      values: stored.map(({ recordId, values: items }) => ({ recordId, values: items })),
      drafts: drafts.filter((draft) => shown.has(draft.recordId)),
      draftsCount: drafts.length,
    };
  }

  /**
   * Страница таблицы админки запросом к базе. Записи с черновиком база
   * оценить не может — черновик лежит JSON-ом: их проверяет память прежними
   * правилами, а в запрос идёт готовый ответ — какие проходят и чем
   * сортируются. Дерево — порядок всех записей из базы (номер и родитель),
   * ветки собирает `pageRecords`, а целиком читаются только записи страницы.
   */
  private async pageInSql(
    key: string,
    source: SqlSource,
    query: PageQuery,
    properties: PageProperty[],
    drafts: RecordDraftDto[],
  ): Promise<RecordsPage<PageRow>> {
    const isFiltered = query.search.trim() !== '' || query.filters.length > 0;
    const sqlDrafts = await this.draftsForSql(key, source, query, properties, drafts);
    const selection: Selection = {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      searchIn: query.searchIn,
      filters: query.filters,
      properties,
      sort: query.sort === null ? null : { field: query.sort },
      isDescending: query.isDescending,
    };
    const sql = { ...(await this.sqlSelection(key, source, selection)), drafts: sqlDrafts };

    if (isFiltered || !query.isTree || !source.hasParent) {
      const { raw, total } = await this.pageWithTotal(
        selectionSql(sql),
        `s.*, r."externalId" AS "$externalId", r."updatedAt" AS "$editedAt"`,
        query.page,
        query.pageSize,
      );
      return { items: await this.decorated(source, raw), total };
    }

    const parts = selectionSql({ ...sql, search: '', filters: [] });
    const order = await this.query(
      `SELECT s.id, s."parentId" FROM ${parts.from}${parts.joins} WHERE ${parts.where} ORDER BY ${parts.orderBy}`,
      parts.replacements,
    );
    const light = order.map((row) => ({ id: row.id as number, parentId: row.parentId as number | null }));
    const tree = pageRecords(light, { ...query, sort: null, search: '', filters: [] }, [], new Map());
    const ids = tree.items.map((item) => String(item.id));
    const rows = await this.adminRows(key, source, ids);
    const byId = new Map(rows.map((row) => [String(row.id), row]));
    return { items: ids.flatMap((id) => byId.get(id) ?? []), total: tree.total };
  }

  /**
   * Черновики для запроса: записи с черновиком, какие из них проходят поиск
   * и фильтр с черновиком поверх и чем сортируются, если черновик меняет поле
   * сортировки. Черновиков нет — undefined.
   */
  private async draftsForSql(
    key: string,
    source: SqlSource,
    query: PageQuery,
    properties: PageProperty[],
    drafts: RecordDraftDto[],
  ): Promise<SqlDrafts | undefined> {
    const own = drafts.filter((draft) => /^\d+$/.test(draft.recordId));
    if (own.length === 0) return undefined;
    const ids = own.map((draft) => draft.recordId);
    const [rows, stored] = await Promise.all([
      this.adminRows(key, source, ids),
      this.values.findSome(key, ids, properties.map((property) => property.id)),
    ]);
    return sqlDraftsOf(rows, valuesOf(stored), own, query, properties);
  }

  /** Записи по номерам для таблицы админки: с вычисляемыми полями раздела и «Изменено» по свойствам. */
  private async adminRows(key: string, source: SqlSource, ids: string[]): Promise<PageRow[]> {
    const numeric = ids.filter((id) => /^(0|[1-9][0-9]{0,8})$/.test(id));
    if (numeric.length === 0) return [];
    const { from, where, replacements } = selectionSql(
      await this.sqlSelection(key, source, {
        page: 1,
        pageSize: 0,
        search: '',
        searchIn: [],
        filters: [],
        properties: [],
        sort: null,
        isDescending: false,
      }),
    );
    const raw = await this.query(
      `SELECT s.*, r."externalId" AS "$externalId", r."updatedAt" AS "$editedAt" FROM ${from}` +
        ` WHERE ${where} AND s.id IN (:wantedIds) ORDER BY ${SECTION_ORDER}`,
      { ...replacements, wantedIds: numeric.map(Number) },
    );
    return this.decorated(source, raw);
  }

  /** Строки таблицы — в записи раздела, с внешним ID. */
  private sqlRows(source: SqlSource, raw: Record<string, unknown>[]): PageRow[] {
    return source.rowsOf(raw).map((row, index) => ({ ...row, externalId: (raw[index].$externalId as string | null) ?? null }));
  }

  /** Записи таблицы админки: вычисляемые поля раздела и «Изменено» с правкой свойств. */
  private async decorated(source: SqlSource, raw: Record<string, unknown>[]): Promise<PageRow[]> {
    const plain = this.sqlRows(source, raw);
    const rows = source.decorate
      ? (await source.decorate(raw, plain)).map((row, index) => ({ ...row, externalId: plain[index].externalId }))
      : plain;
    const editedAt = new Map(
      raw.flatMap((item) => (item.$editedAt instanceof Date ? [[String(item.id), item.$editedAt] as const] : [])),
    );
    return withEditedAt(rows, editedAt);
  }

  /** Описание отбора для запроса: настройки списка, владелец, порядок строк базы. */
  private async sqlSelection(key: string, source: SqlSource, selection: Selection): Promise<SqlSelection> {
    const [settingsId, collation] = await Promise.all([this.settings.settingsId(key), this.collation()]);
    return {
      table: source,
      settingsId: settingsId ?? 0,
      ownerId: source.owner === undefined ? null : Number(key.split('.')[1] ?? 0),
      search: selection.search,
      searchIn: selection.searchIn,
      filters: selection.filters,
      properties: selection.properties,
      sort: selection.sort,
      isDescending: selection.isDescending,
      site: selection.site,
      parentId: selection.parentId,
      collation,
    };
  }

  /**
   * Порядок строк как у `localeCompare('ru')` — правило ICU для русского.
   * Postgres без ICU (свой сервер у того, кто ставит панель) — порядок базы.
   */
  private collation(): Promise<string> {
    this.collationCheck ??= this.query(`SELECT 1 FROM pg_collation WHERE collname = 'ru-RU-x-icu'`, {}).then(
      (rows) => (rows.length > 0 ? 'COLLATE "ru-RU-x-icu"' : ''),
      () => '',
    );
    return this.collationCheck;
  }

  /**
   * Страница запросом и сколько всего: `COUNT(*) OVER ()` в том же запросе —
   * отбор делается один раз, а не второй раз ради `COUNT`. Страница за концом
   * списка строк не вернёт — тогда счёт отдельным запросом.
   */
  private async pageWithTotal(
    parts: SqlParts,
    columns: string,
    page: number,
    pageSize: number,
  ): Promise<{ raw: Record<string, unknown>[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const raw = await this.query(
      `SELECT ${columns}, COUNT(*) OVER () AS "$total" FROM ${parts.from}${parts.joins}` +
        ` WHERE ${parts.where} ORDER BY ${parts.orderBy} LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      parts.replacements,
    );
    if (raw.length > 0) return { raw, total: Number(raw[0].$total) };
    return { raw, total: offset === 0 ? 0 : await this.count(parts.from, parts.where, parts.replacements) };
  }

  private async count(from: string, where: string, replacements: Record<string, unknown>): Promise<number> {
    const [row] = await this.query(`SELECT COUNT(*)::int AS total FROM ${from} WHERE ${where}`, replacements);
    return Number(row?.total ?? 0);
  }

  private query(sql: string, replacements: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    return this.sequelize.query<Record<string, unknown>>(sql, { replacements, type: QueryTypes.SELECT });
  }

  /* --- небольшие списки: отбор в памяти, как раньше --- */

  private async selectInMemory(key: string, selection: Selection): Promise<RecordsPage<PageRow>> {
    const sortProperty =
      selection.sort !== null && 'propertyId' in selection.sort
        ? selection.properties.find((item) => item.id === (selection.sort as { propertyId: number }).propertyId)
        : undefined;
    const rows = await this.parentRows(key, selection);
    const needed = filteredProperties(selection);
    const values = await this.valuesInMemory(key, sortProperty ? [...needed, sortProperty] : needed, selection.site);
    const sorted = sortProperty
      ? rows.map((row) => ({ ...row, [SORT_VALUE]: values.get(String(row.id))?.get(sortProperty.id) ?? null }))
      : rows;
    return pageRecords(
      sorted,
      {
        page: selection.page,
        pageSize: selection.pageSize,
        search: selection.search,
        searchIn: selection.searchIn,
        sort: selection.sort === null ? null : 'field' in selection.sort ? selection.sort.field : SORT_VALUE,
        isDescending: selection.isDescending,
        isTree: false,
        filters: selection.filters,
      },
      memoryProperties(selection),
      values,
    );
  }

  /** Все записи, которые проходят отбор, — в памяти, для подсчёта фасетов. */
  private async matchedInMemory(key: string, selection: Selection): Promise<PageRow[]> {
    const rows = await this.parentRows(key, selection);
    const values = await this.valuesInMemory(key, filteredProperties(selection), selection.site);
    return pageRecords(
      rows,
      { ...selection, page: 1, pageSize: Math.max(rows.length, 1), sort: null, isTree: false },
      memoryProperties(selection),
      values,
    ).items;
  }

  private async parentRows(key: string, selection: Selection): Promise<PageRow[]> {
    const rows = selection.site ? await this.siteRows(key) : await this.rows(key);
    const parent = selection.parentId;
    if (parent === undefined) return rows;
    return rows.filter((row) => ((row.parentId ?? null) === null ? parent === null : String(row.parentId) === parent));
  }

  /** Значения свойств `properties` всех записей списка; на сайте мультидоменные — уже для домена. */
  private async valuesInMemory(
    key: string,
    properties: PageProperty[],
    site: Selection['site'],
  ): Promise<RecordValues> {
    const values = valuesOf(await this.values.findSome(key, null, properties.map((property) => property.id)));
    if (site === undefined) return values;
    const multiDomain = new Set(properties.filter((property) => property.isMultiDomain).map((property) => property.id));
    values.forEach((own) => own.forEach((value, id) => multiDomain.has(id) && own.set(id, domainValue(value, site.domainId))));
    return values;
  }
}

/** Свойства, по которым отбирают, — их значения нужны отбору в памяти. */
const filteredProperties = (selection: Selection): PageProperty[] =>
  selection.properties.filter((property) => selection.filters.some((filter) => filter.key === `property-${property.id}`));

/** Свойства для отбора в памяти: на сайте значения уже для домена — мультидоменных нет. */
const memoryProperties = (selection: Selection): PageProperty[] =>
  selection.site ? selection.properties.map((property) => ({ ...property, isMultiDomain: false })) : selection.properties;

/** Значения из `values/` — в карту для отбора: ключ записи → номер свойства → значение. */
const valuesOf = (stored: PropertyValuesDto[]): RecordValues =>
  new Map(stored.map((record) => [record.recordId, new Map(record.values.map((item) => [item.propertyId, item.value]))]));

/**
 * Страница таблицы в памяти: ищут и сортируют по тому, что сейчас в карточке, —
 * с черновиками поверх. Отдаётся же опубликованное: черновик карточка
 * накладывает сама и показывает обе версии, а для этого ей нужна каждая
 * по отдельности. `isDraftOnly` — только записи с черновиком.
 */
function pageInMemory(
  published: PageRow[],
  stored: PropertyValuesDto[],
  drafts: RecordDraftDto[],
  query: PageQuery,
  properties: PageProperty[],
  isDraftOnly: boolean,
): RecordsPage<PageRow> {
  const draftIds = new Set(drafts.map((draft) => draft.recordId));
  const drafted = withDrafts(published, valuesOf(stored), drafts);
  const rows = isDraftOnly ? drafted.rows.filter((row) => draftIds.has(String(row.id))) : drafted.rows;
  const page = pageRecords(rows, query, properties, drafted.values);
  const publishedById = new Map(published.map((row) => [String(row.id), row]));
  return { ...page, items: page.items.map((item) => publishedById.get(String(item.id)) ?? item) };
}
