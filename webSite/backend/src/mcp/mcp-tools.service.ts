import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/auth.types';
import { contentItemsList, CONTENTS_LIST } from '../infoblocks/contents/content-lists';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../infoblocks/products/product-lists';
import { mcpList, type McpList } from './mcp-lists';
import {
  assertFields,
  mergeValues,
  mimeTypeOf,
  panelFilters,
  panelKey,
  propertyOut,
  recordOut,
  valuesOf,
  type McpFilter,
  type PanelDraft,
  type PanelProperty,
  type PanelValue,
} from './mcp-values';
import { PanelClient } from './panel-client';

/** Что инструмент вернул ассистенту и что запомнит журнал. */
export interface ToolOutcome {
  data: unknown;
  what: string;
  detail: string;
  result: string;
}

type Args = Record<string, unknown>;

/** Настройки списка — поля `GET /infoblocks/settings/:listKey`, которые нужны MCP. */
interface PanelSettings {
  name: string | null;
  useCode: boolean;
  codeRequired: boolean;
  codeUnique: boolean;
  hasJournal: boolean;
  hasDrafts: boolean;
  isDraftEnabled: boolean;
  maxDepth: number | null;
}

interface RecordsPage {
  items: Record<string, unknown>[];
  total: number;
  values: { recordId: string; values: PanelValue[] }[];
  drafts: PanelDraft[];
  draftsCount: number;
}

type Row = Record<string, unknown> & { id: number; name?: string };

/** Список, как его знает инструмент: где писать, настройки и свойства. */
interface Loaded {
  list: McpList;
  name: string;
  settings: PanelSettings;
  properties: PanelProperty[];
}

/**
 * Инструменты MCP. Каждый — несколько вызовов маршрутов панели от имени
 * владельца токена (`PanelClient`): права, проверки и журнал — у разделов.
 * Своё здесь только то, чего у панели нет одним маршрутом: свойства по кодам
 * и сохранение «поля + свойства + черновик» одним вызовом — как это делает
 * карточка записи в браузере.
 */
@Injectable()
export class McpToolsService {
  constructor(private readonly panel: PanelClient) {}

  run(user: JwtPayload, tool: string, args: Args): Promise<ToolOutcome> {
    switch (tool) {
      case 'list_lists':
        return this.listLists(user);
      case 'describe_list':
        return this.describeList(user, args);
      case 'find_records':
        return this.findRecords(user, args);
      case 'get_record':
        return this.getRecord(user, args);
      case 'get_history':
        return this.getHistory(user, args);
      case 'save_record':
        return this.saveRecord(user, args);
      case 'publish_draft':
        return this.publishDraft(user, args);
      case 'discard_draft':
        return this.discardDraft(user, args);
      case 'delete_record':
        return this.deleteRecord(user, args);
      case 'upload_file':
        return this.uploadFile(user, args);
      default:
        throw new BadRequestException(`Нет инструмента ${tool}`);
    }
  }

  private async listLists(user: JwtPayload): Promise<ToolOutcome> {
    const [types, sections] = await Promise.all([
      this.panel.get<Row[]>(user, '/infoblocks/contents'),
      this.panel.get<Row[]>(user, '/infoblocks/files/sections'),
    ]);
    // Разделы свойств и группы приходят с номером `property-6`, `group-…`: своих списков файлов у них нет
    const ownSections = sections.filter((section) => /^\d+$/.test(String(section.id)));
    const keys = [
      'pages',
      CONTENTS_LIST,
      ...types.map((type) => contentItemsList(type.id)),
      PRODUCTS_LIST,
      CATEGORIES_LIST,
      'file-sections',
      ...ownSections.map((section) => `files.${section.id}`),
      'domains',
    ];
    const sectionNames = new Map(ownSections.map((section) => [`files.${section.id}`, `Файлы · ${section.name}`]));

    const lists = await Promise.all(
      keys.map(async (key) => {
        const settings = await this.panel.get<PanelSettings>(user, `/infoblocks/settings/${key}`);
        return {
          list: key,
          name: sectionNames.get(key) ?? settings.name ?? key,
          isTree: settings.maxDepth !== 1,
          isDraftEnabled: settings.isDraftEnabled,
          canCreate: mcpList(key).canCreate,
        };
      }),
    );
    return { data: { lists }, what: '', detail: `${lists.length} списков`, result: 'Выполнено' };
  }

  private async describeList(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const { list, settings, properties } = loaded;
    const isTree = settings.maxDepth !== 1;
    const data = {
      list: list.key,
      name: loaded.name,
      isTree,
      maxDepth: settings.maxDepth,
      canCreate: list.canCreate,
      code: settings.useCode
        ? { isRequired: settings.codeRequired, isUnique: settings.codeUnique }
        : 'кода у записей нет',
      drafts: settings.hasDrafts
        ? {
            isEnabled: settings.isDraftEnabled,
            defaultTarget: settings.isDraftEnabled ? 'draft' : 'published',
          }
        : 'черновиков у этого списка не бывает',
      hasHistory: settings.hasJournal,
      fields: this.fieldsOf(loaded),
      properties: properties.map(propertyOut),
    };
    return {
      data,
      what: loaded.name,
      detail: `${properties.length} свойств, черновики ${settings.isDraftEnabled ? 'включены' : 'выключены'}`,
      result: 'Выполнено',
    };
  }

  private async findRecords(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const filters = optionalArray<McpFilter>(args, 'filters') ?? [];
    const sort = optionalText(args, 'sort');
    const page = await this.panel.get<RecordsPage>(user, `/infoblocks/records/${loaded.list.key}`, {
      page: optionalNumber(args, 'page'),
      pageSize: optionalNumber(args, 'pageSize'),
      search: optionalText(args, 'search'),
      searchIn: this.searchIn(loaded),
      sort: sort === undefined ? undefined : panelKey(sort, loaded.properties),
      order: optionalText(args, 'order'),
      isDraft: args.isDraftOnly === true ? true : undefined,
      filters: filters.length > 0 ? JSON.stringify(panelFilters(filters, loaded.properties)) : undefined,
    });
    const records = this.recordsOf(loaded, page);
    const search = optionalText(args, 'search');
    return {
      data: { total: page.total, records },
      what: loaded.name,
      detail: [search ? `«${search}»` : '', filters.length > 0 ? `${filters.length} полей фильтра` : '', `найдено ${page.total}`]
        .filter(Boolean)
        .join(' · '),
      result: 'Выполнено',
    };
  }

  private async getRecord(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const record = await this.recordOf(user, loaded, id(args));
    return {
      data: record,
      what: this.what(loaded, record),
      detail: record.draft ? 'Опубликованное и черновик' : '',
      result: 'Выполнено',
    };
  }

  private async getHistory(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const record = await this.recordOf(user, loaded, id(args));
    const rows = await this.panel.get<unknown[]>(user, `/infoblocks/history/${loaded.list.key}/${record.id}`);
    const limit = optionalNumber(args, 'limit') ?? 20;
    return {
      data: { total: rows.length, history: rows.slice(0, limit) },
      what: this.what(loaded, record),
      detail: `${rows.length} правок`,
      result: 'Выполнено',
    };
  }

  /**
   * Сохранить запись — так же, как карточка в браузере: поля маршрутом раздела,
   * свойства — маршрутом значений, черновик — своим. Новая запись в черновик
   * сначала заводится как обычно (без этого у неё нет номера) и сразу
   * помечается черновиком: на сайте её не будет до публикации.
   */
  private async saveRecord(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const { list, settings, properties } = loaded;
    const fields = optionalObject(args, 'fields') ?? {};
    const changes = valuesOf(properties, optionalObject(args, 'properties') ?? {});
    assertFields(fields, this.fieldsOf(loaded));

    const target = optionalText(args, 'target') ?? (settings.isDraftEnabled ? 'draft' : 'published');
    if (target !== 'draft' && target !== 'published') throw new BadRequestException('target — "draft" или "published"');
    if (target === 'draft' && !settings.isDraftEnabled) {
      throw new BadRequestException('В этом списке черновики выключены — сохраните с target "published"');
    }
    const changed = changedNames(fields, changes, properties);
    const toDraft = target === 'draft';

    if (args.id === undefined) {
      if (!list.canCreate) throw new BadRequestException('Файлы заводятся загрузкой — upload_file');
      const created = await this.panel.post<Row>(user, list.path(list.owner), this.sectionBody(list, fields));
      await this.saveValues(user, list, created.id, changes, fields);
      if (toDraft) {
        await this.panel.put(user, `/infoblocks/drafts/${list.key}/${created.id}`, { fields: {}, values: [], isNew: true });
      }
      const record = await this.recordOf(user, loaded, created.id);
      return {
        data: record,
        what: this.what(loaded, record),
        detail: `Новая запись · ${toDraft ? 'в черновик' : 'сразу в опубликованное'}`,
        result: toDraft ? 'Черновик сохранён' : 'Опубликовано',
      };
    }

    const before = await this.recordOf(user, loaded, id(args));
    if (toDraft) {
      // Черновик хранит всё отличие от опубликованного: новая правка ложится поверх прежней
      const stored = (await this.panel.get<{ draft: PanelDraft | null }>(user, `/infoblocks/drafts/${list.key}/${before.id}`)).draft;
      await this.panel.put(user, `/infoblocks/drafts/${list.key}/${before.id}`, {
        fields: { ...(stored?.fields ?? {}), ...fields },
        values: mergeValues(stored?.values ?? [], changes),
      });
    } else {
      const body = this.sectionBody(list, fields);
      if (Object.keys(body).length > 0) await this.panel.patch(user, `${list.path(list.owner)}/${before.id}`, body);
      await this.saveValues(user, list, before.id, changes, fields);
    }

    const record = await this.recordOf(user, loaded, before.id);
    const note = !toDraft && record.draft ? ' · черновик записи не тронут' : '';
    return {
      data: record,
      what: this.what(loaded, record),
      detail: `${changed || 'без изменений'} · ${toDraft ? 'в черновик' : 'сразу в опубликованное'}${note}`,
      result: toDraft ? 'Черновик сохранён' : 'Опубликовано',
    };
  }

  /** Публикация — как «Опубликовать» в панели: правки черновика маршрутами раздела и значений, потом снять черновик. */
  private async publishDraft(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const { list } = loaded;
    const before = await this.recordOf(user, loaded, id(args));
    const { draft } = await this.panel.get<{ draft: PanelDraft | null }>(user, `/infoblocks/drafts/${list.key}/${before.id}`);
    if (!draft) throw new BadRequestException('У записи нет черновика');

    const body = this.sectionBody(list, draft.fields);
    if (Object.keys(body).length > 0) await this.panel.patch(user, `${list.path(list.owner)}/${before.id}`, body);
    await this.saveValues(user, list, before.id, draft.values, draft.fields);
    await this.panel.post(user, `/infoblocks/drafts/${list.key}/${before.id}/publish`);

    const record = await this.recordOf(user, loaded, before.id);
    return {
      data: record,
      what: this.what(loaded, record),
      detail: draft.isNew ? 'Первая публикация' : changedNames(draft.fields, draft.values, loaded.properties),
      result: 'Опубликовано',
    };
  }

  private async discardDraft(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const record = await this.recordOf(user, loaded, id(args));
    if (!record.draft) throw new BadRequestException('У записи нет черновика');
    await this.panel.delete(user, `/infoblocks/drafts/${loaded.list.key}/${record.id}`);
    return { data: { isDone: true }, what: this.what(loaded, record), detail: '', result: 'Черновик удалён' };
  }

  private async deleteRecord(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const loaded = await this.load(user, text(args, 'list'));
    const record = await this.recordOf(user, loaded, id(args));
    const removed = await this.panel.delete<unknown>(user, `${loaded.list.path(loaded.list.owner)}/${record.id}`);
    return { data: removed ?? { isDone: true }, what: this.what(loaded, record), detail: '', result: 'Удалено' };
  }

  private async uploadFile(user: JwtPayload, args: Args): Promise<ToolOutcome> {
    const fileName = text(args, 'fileName');
    const content = Buffer.from(text(args, 'contentBase64'), 'base64');
    if (content.length === 0) throw new BadRequestException('Файл пустой');

    const sectionId = optionalNumber(args, 'sectionId');
    const propertyCode = optionalText(args, 'propertyCode');
    let target: Record<string, string>;
    if (sectionId !== undefined) {
      target = { sectionId: String(sectionId) };
    } else if (propertyCode !== undefined) {
      const loaded = await this.load(user, text(args, 'list'));
      const property = loaded.properties.find((item) => item.code === propertyCode);
      if (!property || property.id === undefined) throw new BadRequestException(`Нет свойства «${propertyCode}»`);
      target = { propertyId: String(property.id) };
    } else {
      throw new BadRequestException('Куда загрузить: sectionId или propertyCode со списком');
    }

    const file = await this.panel.upload<Row>(
      user,
      '/infoblocks/files/upload',
      { name: fileName, mimeType: optionalText(args, 'mimeType') ?? mimeTypeOf(fileName), content },
      target,
    );
    return {
      data: file,
      what: `Файлы · #${file.id} «${file.name ?? fileName}»`,
      detail: `${Math.ceil(content.length / 1024)} КБ`,
      result: 'Загружено',
    };
  }

  private async load(user: JwtPayload, listKey: string): Promise<Loaded> {
    const list = mcpList(listKey);
    const [settings, properties] = await Promise.all([
      this.panel.get<PanelSettings>(user, `/infoblocks/settings/${list.key}`),
      // У файлов свойств не бывает — и маршрута их свойств тоже
      list.kind === 'files'
        ? Promise.resolve([] as PanelProperty[])
        : this.panel.get<PanelProperty[]>(user, `/infoblocks/settings/${list.key}/properties`),
    ]);
    return { list, name: settings.name ?? list.key, settings, properties };
  }

  /** Поля записи по правилам списка: без кода, если он выключен, без родителя у плоского. */
  private fieldsOf({ list, settings }: Loaded) {
    return list.fields.filter(
      (field) => (field.key !== 'code' || settings.useCode) && (field.key !== 'parentId' || settings.maxDepth !== 1),
    );
  }

  private searchIn({ list }: Loaded): string {
    return list.fields
      .map((field) => field.key)
      .filter((key) => key === 'name' || key === 'code')
      .join(',');
  }

  /** Одна запись: страница таблицы, отобранная по номеру, — с её значениями и черновиком. */
  private async recordOf(user: JwtPayload, loaded: Loaded, recordId: number) {
    const page = await this.panel.get<RecordsPage>(user, `/infoblocks/records/${loaded.list.key}`, {
      filters: JSON.stringify([{ key: 'id', kind: 'range', from: recordId, to: recordId }]),
    });
    const [record] = this.recordsOf(loaded, page);
    if (!record) throw new NotFoundException(`В списке ${loaded.list.key} нет записи #${recordId}`);
    return record;
  }

  private recordsOf({ properties }: Loaded, page: RecordsPage) {
    const values = new Map(page.values.map((item) => [item.recordId, item.values]));
    const drafts = new Map(page.drafts.map((draft) => [draft.recordId, draft]));
    return page.items.map((item) => {
      const key = String(item.id);
      return recordOut(item, properties, values.get(key) ?? [], drafts.get(key)) as ReturnType<typeof recordOut> & Row;
    });
  }

  /** Поля для маршрута раздела: родитель списка, ставшего деревом настройкой, раздел не принимает. */
  private sectionBody(list: McpList, fields: Record<string, unknown>): Record<string, unknown> {
    if (list.isOwnParent) return fields;
    const { parentId: _parent, ...rest } = fields;
    return rest;
  }

  /** Свойства — маршрутом значений; туда же родитель, если раздел его не хранит. */
  private async saveValues(
    user: JwtPayload,
    list: McpList,
    recordId: number,
    values: PanelValue[],
    fields: Record<string, unknown>,
  ): Promise<void> {
    const parent = !list.isOwnParent && fields.parentId !== undefined ? { parentId: fields.parentId === null ? null : String(fields.parentId) } : {};
    if (values.length === 0 && !('parentId' in parent)) return;
    await this.panel.patch(user, `/infoblocks/${list.key}/values/${recordId}`, { values, ...parent });
  }

  private what(loaded: Loaded, record: Row): string {
    return `${loaded.name} · #${record.id}${record.name ? ` «${record.name}»` : ''}`;
  }
}

/** Что поменялось — для журнала: поля по ключам, свойства по названиям. */
function changedNames(fields: Record<string, unknown>, values: PanelValue[], properties: PanelProperty[]): string {
  const names = new Map(properties.map((property) => [property.id, property.name]));
  return [...Object.keys(fields), ...values.map((item) => names.get(item.propertyId) ?? `#${item.propertyId}`)].join(', ');
}

const text = (args: Args, key: string): string => {
  const value = args[key];
  if (typeof value !== 'string' || value.trim() === '') throw new BadRequestException(`Нужен аргумент ${key} — строка`);
  return value.trim();
};

const optionalText = (args: Args, key: string): string | undefined => {
  const value = args[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new BadRequestException(`${key} — строка`);
  return value;
};

const optionalNumber = (args: Args, key: string): number | undefined => {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new BadRequestException(`${key} — целое число`);
  return value;
};

const id = (args: Args): number => {
  const value = optionalNumber(args, 'id');
  if (value === undefined || value < 1) throw new BadRequestException('Нужен id записи — целое число');
  return value;
};

const optionalObject = (args: Args, key: string): Record<string, unknown> | undefined => {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException(`${key} — объект`);
  return value as Record<string, unknown>;
};

const optionalArray = <T>(args: Args, key: string): T[] | undefined => {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new BadRequestException(`${key} — массив`);
  return value as T[];
};
