import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { normalizeValues, PropertyType, type PropertyDef } from '../settings/properties/property';
import { valuesMap } from '../values/property-values.service';
import type { PropertyValue } from '../values/property-values.model';
import {
  domainValue,
  FilterKind,
  pageRecords,
  tallyOf,
  withDrafts,
  withEditedAt,
  type PageDraft,
  type PageProperty,
  type PageQuery,
  type PageRow,
  type RecordFilter,
  type RecordValues,
} from './records-page';
import { selectionSql, sqlDraftsOf, tallySql, type SqlSelection, type SqlTable } from './records-sql';

/**
 * Отбор запросом к базе находит то же, что и отбор в памяти. На настоящем
 * Postgres: случайные записи и значения (мультидоменные, оставшиеся от прежних
 * настроек строки, ссылки чужого списка) в своей схеме, и сотни случайных
 * запросов — каждый сравнивается с `pageRecords` по тем же данным.
 *
 * Нужна база: `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:3403/postgres`
 * (локальный стек, `scripts/dev.sh`). Без неё набор пропускается.
 */
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeDb = DATABASE_URL ? describe : describe.skip;

/** Повторяемая случайность: упавший запрос воспроизводится тем же зерном. */
function random(seed: number) {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const int = (max: number) => Math.floor(next() * max);
  const pick = <T>(items: T[]): T => items[int(items.length)];
  const chance = (p: number) => next() < p;
  return { int, pick, chance };
}

const SCHEMA = `records_sql_spec_${process.pid}`;
const TABLE: SqlTable = { table: 'items', hasParent: true };
const SETTINGS_ID = 7;
const LINK_LIST = 'targets';

const def = (patch: Partial<PropertyDef> & { id: number; code: string; type: PropertyType }): PropertyDef & { id: number } => ({
  name: patch.code,
  hint: '',
  tab: '',
  required: false,
  multiple: false,
  isMultiDomain: false,
  isHidden: false,
  isExternal: false,
  options: [],
  formats: [],
  maxSizeMb: null,
  maxWidth: null,
  maxHeight: null,
  columns: null,
  headers: [],
  linkList: '',
  optionsPropertyId: null,
  ...patch,
});

const options = [
  { id: 101, code: 'a', name: 'A' },
  { id: 102, code: 'b', name: 'B' },
  { id: 103, code: 'c', name: 'C' },
];

const PROPS = [
  def({ id: 1, code: 'price', type: PropertyType.Number }),
  def({ id: 2, code: 'regional', type: PropertyType.Number, isMultiDomain: true }),
  def({ id: 3, code: 'title', type: PropertyType.String }),
  def({ id: 4, code: 'body', type: PropertyType.Html }),
  def({ id: 5, code: 'color', type: PropertyType.List, options }),
  def({ id: 6, code: 'tags', type: PropertyType.List, options, multiple: true }),
  def({ id: 7, code: 'links', type: PropertyType.ContentLink, multiple: true, linkList: LINK_LIST }),
  def({ id: 8, code: 'grid', type: PropertyType.Table, columns: 2 }),
  def({ id: 9, code: 'photo', type: PropertyType.Image }),
  def({ id: 10, code: 'city', type: PropertyType.String, isMultiDomain: true, multiple: true }),
];

const pageProps: PageProperty[] = PROPS.map((property) => ({
  id: property.id,
  type: property.type,
  isMultiDomain: property.isMultiDomain,
  multiple: property.multiple,
  linkList: property.linkList,
}));

const WORDS = ['Альфа', 'альфа', 'Beta', 'ёлка', 'Елка', 'Ёж', 'zeta', '10', '9', 'Бета 2', 'бета-1'];

interface Fixture {
  rows: PageRow[];
  /** Опубликованные значения, как их отдаёт чтение (`valuesMap` + `normalizeValues`) */
  values: RecordValues;
  editedAt: Map<string, Date>;
  newDrafts: Set<string>;
}

/** Случайный список: записи, строки значений и черновики — в базу и в память. */
async function seed(db: Sequelize, seedValue: number): Promise<Fixture> {
  const r = random(seedValue);
  const rows: PageRow[] = [];
  const valueRows: Record<string, unknown>[] = [];
  const editedAt = new Map<string, Date>();
  const base = Date.UTC(2026, 0, 1);
  let valueId = 1;
  let recordId = 1;

  for (let id = 1; id <= 70; id++) {
    const createdAt = new Date(base + r.int(40) * 60000);
    const updatedAt = new Date(createdAt.getTime() + r.int(30) * 60000);
    const row = {
      id,
      code: r.chance(0.2) ? '' : `c${r.int(30)}`,
      name: `${r.pick(WORDS)} ${r.int(5)}`,
      isActive: r.chance(0.85),
      sort: r.pick([100, 200, 500, 500, 500]),
      createdAt,
      updatedAt,
      userId: r.pick([1, 2]),
      parentId: id > 5 && r.chance(0.5) ? 1 + r.int(id - 1) : null,
    };
    await db.query(
      `INSERT INTO items (id, code, name, "isActive", sort, "createdAt", "updatedAt", "userId", "parentId")
       VALUES (:id, :code, :name, :isActive, :sort, :createdAt, :updatedAt, :userId, :parentId)`,
      { replacements: row },
    );
    const externalId = r.chance(0.6) ? `ext-${r.int(100)}-${id}` : null;
    const hasRecord = r.chance(0.9);
    if (hasRecord) {
      const recordUpdatedAt = new Date(createdAt.getTime() + r.int(60) * 60000);
      await db.query(
        `INSERT INTO infoblock_records (id, "settingsId", "recordKey", "updatedAt", "externalId") VALUES (:id, :settingsId, :key, :updatedAt, :externalId)`,
        { replacements: { id: recordId, settingsId: SETTINGS_ID, key: String(id), updatedAt: recordUpdatedAt, externalId } },
      );
      editedAt.set(String(id), recordUpdatedAt);
      valueRows.push(...valuesOfRecord(r, recordId).map((item) => ({ ...item, id: valueId++ })));
      recordId++;
    }
    rows.push({
      id,
      code: row.code,
      name: row.name,
      isActive: row.isActive,
      sort: row.sort,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      authorId: row.userId,
      parentId: row.parentId,
      externalId: hasRecord ? externalId : null,
    });
  }

  for (const item of valueRows) {
    await db.query(
      `INSERT INTO infoblock_values (id, "recordId", "propertyId", sort, text, number, json, "optionId", "domainIds", "exceptDomainIds")
       VALUES (:id, :recordId, :propertyId, :sort, :text, :number, CAST(:json AS jsonb), :optionId,
               CAST(:domainIds AS int[]), CAST(:exceptDomainIds AS int[]))`,
      {
        replacements: {
          text: null,
          number: null,
          optionId: null,
          ...item,
          json: item.json === undefined ? null : JSON.stringify(item.json),
          domainIds: item.domainIds ? `{${(item.domainIds as number[]).join(',')}}` : null,
          exceptDomainIds: item.exceptDomainIds ? `{${(item.exceptDomainIds as number[]).join(',')}}` : null,
        },
      },
    );
  }

  const newDrafts = new Set(rows.filter(() => r.chance(0.05)).map((row) => String(row.id)));
  for (const key of newDrafts) {
    await db.query(`INSERT INTO infoblock_drafts ("settingsId", "recordKey", "isNew") VALUES (:settingsId, :key, true)`, {
      replacements: { settingsId: SETTINGS_ID, key },
    });
  }

  // Значения такими, какими их отдаёт чтение: по строкам записи, по `sort`
  const recordKeys = await db.query<{ id: number; recordKey: string }>(`SELECT id, "recordKey" FROM infoblock_records`, {
    type: QueryTypes.SELECT,
  });
  const values: RecordValues = new Map();
  for (const { id, recordKey } of recordKeys) {
    const own = valueRows
      .filter((item) => item.recordId === id)
      .sort((a, b) => Number(a.sort) - Number(b.sort))
      .map((item) => ({ text: null, number: null, json: null, optionId: null, domainIds: null, exceptDomainIds: null, ...item }));
    const normalized = normalizeValues(PROPS, valuesMap(PROPS, own as unknown as PropertyValue[]), false).values;
    values.set(recordKey, new Map(PROPS.flatMap((property) => (normalized[property.code] === undefined ? [] : [[property.id, normalized[property.code]]]))));
  }
  return { rows, values, editedAt, newDrafts };
}

/** Строки значений одной записи — со всеми странностями, которые бывают в базе. */
function valuesOfRecord(r: ReturnType<typeof random>, recordId: number): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  const add = (propertyId: number, sort: number, columns: Record<string, unknown>) => items.push({ recordId, propertyId, sort, ...columns });

  if (r.chance(0.75)) add(1, 0, { number: r.int(20) });
  // Строка от мультидоменного прошлого: у обычного свойства не читается
  if (r.chance(0.1)) add(1, 1, { number: 99, domainIds: [1] });

  let sort = 0;
  if (r.chance(0.7)) add(2, sort++, { number: r.int(30), ...(r.chance(0.3) ? { exceptDomainIds: [2] } : {}) });
  if (r.chance(0.4)) add(2, sort++, { number: 50 + r.int(30), domainIds: [1] });
  if (r.chance(0.2)) add(2, sort++, { number: 100 + r.int(30), domainIds: [3, 4] });

  if (r.chance(0.8)) add(3, 0, { text: r.pick(WORDS) });
  if (r.chance(0.6)) add(4, 0, { text: `<p>${r.pick(WORDS)} <b>${r.pick(WORDS)}</b></p>\n<p>${r.int(9)}</p>` });

  // Множественность выключили, строки остались: читается первая. Сохранение
  // пишет строки свойства с нуля — вторая бывает только после первой
  if (r.chance(0.8)) {
    add(5, 0, { optionId: r.pick([101, 102, 103]) });
    if (r.chance(0.2)) add(5, 1, { optionId: r.pick([101, 102, 103]) });
  }

  [101, 102, 103].filter(() => r.chance(0.4)).forEach((optionId, index) => add(6, index, { optionId }));

  const links = ['1', '2', '3', '4', '5'].filter(() => r.chance(0.3));
  links.forEach((id, index) => add(7, index, { json: { listKey: LINK_LIST, recordId: id } }));
  // Ссылка чужого списка: чтение её отбрасывает
  if (r.chance(0.1)) add(7, links.length, { json: { listKey: 'other', recordId: '1' } });

  if (r.chance(0.3)) add(8, 0, { json: [['a', 'b']] });
  if (r.chance(0.4)) add(9, 0, { number: 1 + r.int(5) });
  else if (r.chance(0.3)) add(9, 0, { text: 'https://example.com/a.jpg' });

  let citySort = 0;
  if (r.chance(0.6)) [r.pick(WORDS), r.pick(WORDS)].forEach((text) => add(10, citySort++, { text }));
  if (r.chance(0.4)) add(10, citySort++, { text: r.pick(WORDS), domainIds: [1] });
  return items;
}

/** Случайное поле фильтра — каждого вида, по полям записи и свойствам. */
function randomFilter(r: ReturnType<typeof random>): RecordFilter {
  return r.pick<RecordFilter>([
    { key: 'name', kind: FilterKind.Text, text: r.pick(['аль', 'Бета', 'е', '1']) },
    { key: 'code', kind: FilterKind.Options, codes: ['c1', 'c2', 'c3', ''] },
    { key: 'code', kind: FilterKind.Filled, isFilled: r.chance(0.5) },
    { key: 'isActive', kind: FilterKind.Options, codes: [r.pick(['true', 'false'])] },
    { key: 'sort', kind: FilterKind.Range, from: 150, to: null },
    { key: 'id', kind: FilterKind.Range, from: 10, to: 40 },
    { key: 'externalId', kind: FilterKind.Filled, isFilled: r.chance(0.5) },
    { key: 'externalId', kind: FilterKind.Text, text: 'ext-1' },
    { key: 'createdAt', kind: FilterKind.Text, text: '2026-01-01t00:1' },
    { key: 'isMissing', kind: FilterKind.Options, codes: ['false'] },
    { key: 'property-1', kind: FilterKind.Range, from: r.pick([null, 5]), to: r.pick([null, 12]) },
    { key: 'property-1', kind: FilterKind.Options, codes: ['3', '7'] },
    { key: 'property-2', kind: FilterKind.Range, from: 20, to: null },
    { key: 'property-3', kind: FilterKind.Text, text: r.pick(['ал', 'ЁЛ', 'beta', '1']) },
    { key: 'property-3', kind: FilterKind.Range, from: 9, to: 10 },
    { key: 'property-4', kind: FilterKind.Text, text: r.pick(['альфа жирн', 'beta', '7']) },
    { key: 'property-4', kind: FilterKind.Filled, isFilled: r.chance(0.5) },
    { key: 'property-5', kind: FilterKind.Options, codes: [r.pick(['101', '102', '103'])] },
    { key: 'property-6', kind: FilterKind.Options, codes: ['101', '103'] },
    { key: 'property-7', kind: FilterKind.Options, codes: [`${LINK_LIST}/2`, `${LINK_LIST}/4`, 'other/1'] },
    { key: 'property-7', kind: FilterKind.Filled, isFilled: r.chance(0.5) },
    { key: 'property-8', kind: FilterKind.Filled, isFilled: r.chance(0.5) },
    { key: 'property-9', kind: FilterKind.Filled, isFilled: true },
    { key: 'property-9', kind: FilterKind.Range, from: 2, to: 4 },
    { key: 'property-10', kind: FilterKind.Text, text: r.pick(['ал', 'zeta']) },
    { key: 'property-99', kind: FilterKind.Filled, isFilled: r.chance(0.5) },
  ]);
}

const SORTS = ['id', 'name', 'code', 'sort', 'isActive', 'createdAt', 'updatedAt', 'externalId', 'authorId', 'parentId', 'zzz'];

describeDb('отбор в базе = отбор в памяти', () => {
  let db: Sequelize;
  let fixture: Fixture;
  let collation = '';

  beforeAll(async () => {
    db = new Sequelize(DATABASE_URL as string, { logging: false, pool: { max: 1 } });
    await db.query(`CREATE SCHEMA ${SCHEMA}`);
    await db.query(`SET search_path TO ${SCHEMA}`);
    await db.query(`
      CREATE TABLE items (id int PRIMARY KEY, code varchar(255) NOT NULL DEFAULT '', name varchar(255) NOT NULL,
        "isActive" boolean NOT NULL, sort int NOT NULL, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL,
        "userId" int NOT NULL, "parentId" int);
      CREATE TABLE infoblock_records (id int PRIMARY KEY, "settingsId" int NOT NULL, "recordKey" varchar(255) NOT NULL,
        "parentId" varchar(255), "updatedAt" timestamptz NOT NULL, "externalId" varchar(255));
      CREATE TABLE infoblock_values (id int PRIMARY KEY, "recordId" int NOT NULL, "propertyId" int NOT NULL, sort int NOT NULL,
        text text, number double precision, json jsonb, "optionId" int, "domainIds" int[], "exceptDomainIds" int[]);
      CREATE TABLE infoblock_drafts (id serial PRIMARY KEY, "settingsId" int NOT NULL, "recordKey" varchar(255) NOT NULL,
        "isNew" boolean NOT NULL);
    `);
    const icu = await db.query(`SELECT 1 FROM pg_collation WHERE collname = 'ru-RU-x-icu'`, { type: QueryTypes.SELECT });
    collation = icu.length > 0 ? 'COLLATE "ru-RU-x-icu"' : '';
    fixture = await seed(db, 20261107);
  });

  afterAll(async () => {
    await db?.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await db?.close();
  });

  const run = async (selection: SqlSelection, limit: number, offset: number) => {
    const parts = selectionSql(selection);
    const rows = await db.query<{ id: number }>(
      `SELECT s.id FROM ${parts.from}${parts.joins} WHERE ${parts.where} ORDER BY ${parts.orderBy} LIMIT ${limit} OFFSET ${offset}`,
      { replacements: parts.replacements, type: QueryTypes.SELECT },
    );
    const [{ total }] = await db.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM ${parts.from} WHERE ${parts.where}`, {
      replacements: parts.replacements,
      type: QueryTypes.SELECT,
    });
    return { ids: rows.map((row) => row.id), total };
  };

  const selectionOf = (query: PageQuery, patch: Partial<SqlSelection> = {}): SqlSelection => ({
    table: TABLE,
    settingsId: SETTINGS_ID,
    ownerId: null,
    search: query.search,
    searchIn: query.searchIn,
    filters: query.filters,
    properties: pageProps,
    sort: query.sort === null ? null : { field: query.sort },
    isDescending: query.isDescending,
    collation,
    ...patch,
  });

  const randomQuery = (r: ReturnType<typeof random>): PageQuery => ({
    page: 1 + r.int(3),
    pageSize: 7,
    search: r.chance(0.3) ? r.pick(['аль', '#7', '12', 'beta', 'C1', 'ёлка']) : '',
    searchIn: ['name', 'code', 'externalId', 'nothing'],
    // Без сортировки порядок памяти — порядок раздела; страницы так не просят
    sort: r.pick(SORTS),
    isDescending: r.chance(0.5),
    isTree: false,
    filters: Array.from({ length: r.int(3) }, () => randomFilter(r)),
  });

  it('таблица админки: поиск, фильтр, сортировка и страница', async () => {
    const r = random(1);
    const rows = withEditedAt(fixture.rows, fixture.editedAt);
    for (let i = 0; i < 400; i++) {
      const query = randomQuery(r);
      const expected = pageRecords(rows, query, pageProps, fixture.values);
      const found = await run(selectionOf(query), query.pageSize, (query.page - 1) * query.pageSize);
      expect(JSON.stringify({ query, ...found })).toBe(JSON.stringify({ query, ids: expected.items.map((row) => row.id), total: expected.total }));
    }
  });

  it('сайт: только активные и опубликованные, значения для домена, сортировка по свойству', async () => {
    const r = random(2);
    const rows = fixture.rows.filter((row) => row.isActive !== false && !fixture.newDrafts.has(String(row.id)));
    for (let i = 0; i < 400; i++) {
      const domainId = r.pick([null, 1, 2, 3]);
      const sortProperty = r.chance(0.4) ? r.pick([1, 2, 3]) : null;
      const query = randomQuery(r);
      const parentId = r.chance(0.2) ? r.pick([null, '1', '3']) : undefined;
      const values: RecordValues = new Map(
        Array.from(fixture.values, ([id, own]) => [
          id,
          new Map(Array.from(own, ([propertyId, value]) => [propertyId, PROPS[propertyId - 1].isMultiDomain ? domainValue(value, domainId) : value])),
        ]),
      );
      const scoped = parentId === undefined ? rows : rows.filter((row) => (row.parentId === null ? parentId === null : String(row.parentId) === parentId));
      const sorted = sortProperty === null ? scoped : scoped.map((row) => ({ ...row, $sort: values.get(String(row.id))?.get(sortProperty) ?? null }));
      const memoryQuery = { ...query, sort: sortProperty === null ? query.sort : '$sort' };
      const expected = pageRecords(sorted, memoryQuery, pageProps.map((property) => ({ ...property, isMultiDomain: false })), values);

      const found = await run(
        selectionOf(query, {
          site: { domainId },
          parentId,
          sort: sortProperty === null ? (query.sort === null ? null : { field: query.sort }) : { propertyId: sortProperty },
        }),
        query.pageSize,
        (query.page - 1) * query.pageSize,
      );
      // «Изменено» на сайте — правка самой записи
      const expectedIds = expected.items.map((row) => row.id);
      expect(JSON.stringify({ query, domainId, sortProperty, parentId, ...found })).toBe(JSON.stringify({ query, domainId, sortProperty, parentId, ids: expectedIds, total: expected.total }));
    }
  });

  it('фасеты: подсчёт значений в базе = подсчёт в памяти', async () => {
    const r = random(3);
    const facets = pageProps.filter((property) => [1, 2, 5, 6, 7].includes(property.id));
    const rows = fixture.rows.filter((row) => row.isActive !== false && !fixture.newDrafts.has(String(row.id)));
    for (let i = 0; i < 100; i++) {
      const domainId = r.pick([null, 1, 3]);
      const query = { ...randomQuery(r), sort: null };
      const values: RecordValues = new Map(
        Array.from(fixture.values, ([id, own]) => [
          id,
          new Map(Array.from(own, ([propertyId, value]) => [propertyId, PROPS[propertyId - 1].isMultiDomain ? domainValue(value, domainId) : value])),
        ]),
      );
      const plain = pageProps.map((property) => ({ ...property, isMultiDomain: false }));
      const matched = pageRecords(rows, { ...query, page: 1, pageSize: rows.length }, plain, values).items;

      const { sql, replacements } = tallySql(selectionOf(query, { site: { domainId } }), facets);
      const found = await db.query<{ propertyId: number; key: string | null; count: number; min: number | null; max: number | null }>(sql, {
        replacements,
        type: QueryTypes.SELECT,
      });
      for (const property of facets) {
        const expected = tallyOf({ ...property, isMultiDomain: false }, matched, values);
        const own = found.filter((row) => row.propertyId === property.id);
        const counts = new Map(
          own.flatMap((row) => (row.key === null ? [] : [[property.type === PropertyType.ContentLink ? `${LINK_LIST}/${row.key}` : row.key, row.count] as const])),
        );
        const min = own.find((row) => row.min !== null)?.min ?? null;
        const max = own.find((row) => row.max !== null)?.max ?? null;
        expect({ query, domainId, property: property.id, counts: Object.fromEntries(counts), min, max }).toEqual({
          query,
          domainId,
          property: property.id,
          counts: Object.fromEntries(expected.counts),
          min: expected.min,
          max: expected.max,
        });
      }
    }
  });

  it('черновики: отбор и сортировка с черновиком поверх', async () => {
    const r = random(4);
    const published = withEditedAt(fixture.rows, fixture.editedAt);
    const drafts: PageDraft[] = [3, 8, 15, 22, 41].map((id) => ({
      recordId: String(id),
      // Родителя черновик не меняет — его поле в черновике ничего не значит
      fields: { name: r.pick(WORDS), ...(r.chance(0.5) ? { sort: r.pick([1, 900]) } : {}), ...(r.chance(0.3) ? { parentId: 2 } : {}) },
      values: r.chance(0.5) ? [{ propertyId: 1, value: r.int(20) }] : [{ propertyId: 5, value: 102 }],
    }));
    const drafted = withDrafts(published, fixture.values, drafts);
    const ids = drafts.map((draft) => draft.recordId);
    for (let i = 0; i < 200; i++) {
      const query = randomQuery(r);
      const expected = pageRecords(drafted.rows, query, pageProps, drafted.values);
      const sqlDrafts = sqlDraftsOf(
        published.filter((row) => ids.includes(String(row.id))),
        new Map(ids.map((id) => [id, fixture.values.get(id) ?? new Map()])),
        drafts,
        query,
        pageProps,
      );
      const found = await run(selectionOf(query, { drafts: sqlDrafts }), query.pageSize, (query.page - 1) * query.pageSize);
      expect(JSON.stringify({ query, ...found })).toBe(JSON.stringify({ query, ids: expected.items.map((row) => row.id), total: expected.total }));
    }
  });

  it('дерево: порядок из базы и ветки из памяти — как дерево в памяти', async () => {
    const rows = withEditedAt(fixture.rows, fixture.editedAt);
    for (const sort of SORTS) {
      for (const isDescending of [false, true]) {
        const query: PageQuery = { page: 2, pageSize: 4, search: '', searchIn: [], sort, isDescending, isTree: true, filters: [] };
        const expected = pageRecords(rows, query, [], new Map());
        const order = await run(selectionOf(query), 1000, 0);
        const light = order.ids.map((id) => ({ id, parentId: rows.find((row) => row.id === id)?.parentId ?? null }));
        const tree = pageRecords(light as PageRow[], { ...query, sort: null }, [], new Map());
        expect({ sort, isDescending, ids: tree.items.map((row) => row.id), total: tree.total }).toEqual({
          sort,
          isDescending,
          ids: expected.items.map((row) => row.id),
          total: expected.total,
        });
      }
    }
  });
});
