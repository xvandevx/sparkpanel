import { BadRequestException, Injectable } from '@nestjs/common';
import { UserDto } from '../../users/dto/user.dto';
import { UsersService } from '../../users/users.service';
import { CONTENT_ITEMS_KIND, CONTENTS_LIST } from '../contents/content-lists';
import { ContentsService } from '../contents/contents.service';
import { ContentItemsService } from '../contents/items/content-items.service';
import { DomainsService } from '../domains/domains.service';
import { DraftsService } from '../drafts/drafts.service';
import { PROPERTY_FILES_KIND } from '../files/file-lists';
import { FilesService } from '../files/files.service';
import { FileSectionsService } from '../files/sections/file-sections.service';
import { FORM_FIELDS_LIST, FORMS_LIST } from '../forms/form-lists';
import { FormFieldsService } from '../forms/fields/form-fields.service';
import { FormsService } from '../forms/forms.service';
import { PagesService } from '../pages/pages.service';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../products/product-lists';
import { ProductCategoriesService } from '../products/categories/product-categories.service';
import { ProductsService } from '../products/products.service';
import { RolesService } from '../roles/roles.service';
import { resolveInfoblock } from '../settings/infoblock-kinds';
import { InfoblockSettingsService } from '../settings/settings.service';
import { StoragesService } from '../storages/storages.service';
import { PropertyValuesService } from '../values/property-values.service';
import { RecordsPageQueryDto } from './dto/records-page-query.dto';
import { RecordsPageDto } from './dto/records-page.dto';
import {
  PAGE_SIZES,
  pageRecords,
  parseFilters,
  withDrafts,
  withEditedAt,
  type PageRow,
  type RecordValues,
} from './records-page';

/**
 * Записи списка: кто их отдаёт. `owner` — номер владельца у вложенного списка
 * (`content-items.3` → тип 3, `files.10` → раздел 10), у остальных null.
 */
type RecordsLoader = (owner: number) => Promise<PageRow[]>;

/**
 * Страница записей любого списка редактора контента — для таблицы. Записи
 * берёт у сервиса своего раздела теми же правилами, что и его `GET`
 * (владелец, вычисляемые поля), значения свойств — у `values/`, а отбирает
 * общим `pageRecords`: у всех списков одна и та же страница, поиск и фильтр.
 *
 * Отдельным модулем, а не в модуле настроек или значений: ему нужны сервисы
 * всех разделов, а разделы сами импортируют те модули — вышло бы кольцо.
 * Этот модуль не импортирует никто.
 */
@Injectable()
export class RecordsService {
  /** Ключ вида списка → его записи. Нового раздела здесь нет — его страница 400. */
  private readonly loaders: Record<string, RecordsLoader>;

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

  async page(listKey: string, query: RecordsPageQueryDto): Promise<RecordsPageDto> {
    const { key } = resolveInfoblock(listKey);
    const filters = parseFilters(query.filters);

    const [loaded, { properties }, stored, editedAt, drafts] = await Promise.all([
      this.rows(key),
      this.settings.settingsOf(key),
      this.values.findAll(key),
      this.values.editedAt(key),
      this.drafts.findAll(key),
    ]);
    // «Изменено» — с правкой свойств: по нему и сортируют, и в ячейке оно же
    const published = withEditedAt(loaded, editedAt);

    const storedValues: RecordValues = new Map(
      stored.map((record) => [
        record.recordId,
        new Map(record.values.map((item) => [item.propertyId, item.value])),
      ]),
    );

    // Ищут и сортируют по тому, что сейчас в карточке, — с черновиками поверх.
    // Отдаётся же опубликованное: черновик карточка накладывает сама и показывает
    // обе версии, а для этого ей нужна каждая по отдельности
    const draftIds = new Set(drafts.map((draft) => draft.recordId));
    const drafted = withDrafts(published, storedValues, drafts);
    const rows = query.isDraft ? drafted.rows.filter((row) => draftIds.has(String(row.id))) : drafted.rows;
    const values = drafted.values;

    const page = pageRecords(
      rows,
      {
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
      },
      properties.flatMap((property) =>
        property.id === undefined
          ? []
          : [{ id: property.id, type: property.type, isMultiDomain: property.isMultiDomain }],
      ),
      values,
    );

    // Значения — только записей страницы: ими живут её ячейки свойств
    // и карточка записи, открытой из таблицы
    const shown = new Set(page.items.map((item) => String(item.id)));
    const publishedById = new Map(published.map((row) => [String(row.id), row]));
    return {
      ...page,
      items: page.items.map((item) => publishedById.get(String(item.id)) ?? item),
      values: stored
        .filter((record) => shown.has(record.recordId))
        .map(({ recordId, values: items }) => ({ recordId, values: items })),
      drafts: drafts.filter((draft) => shown.has(draft.recordId)),
      draftsCount: drafts.length,
    };
  }
}
