import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { CONTENT_ITEMS_KIND, CONTENTS_LIST, contentItemsList } from '../../contents/content-lists';
import { Contents } from '../../contents/contents.model';
import { ContentItems } from '../../contents/items/content-items.model';
import { FormFields } from '../../forms/fields/form-fields.model';
import { FORM_FIELDS_LIST, FORMS_LIST } from '../../forms/form-lists';
import { Forms } from '../../forms/forms.model';
import { Pages } from '../../pages/pages.model';
import { ProductCategories } from '../../products/categories/product-categories.model';
import { Products } from '../../products/products.model';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../../products/product-lists';
import { Roles } from '../../roles/roles.model';
import { contentTypePath, contentTypesInTreeOrder } from './content-tree';
import { LinkSourceDto } from './link-source.dto';
import { LinkTargetDto } from './link-target.dto';
import { ContentLink, linkKey } from '../properties/property';

/**
 * Что можно выбрать в привязках: страницы, элементы и сами типы контента,
 * товары и категории товаров пользователя, а ещё роли, формы обратной связи и их поля —
 * они общие, владельца у них нет. Записи инфоблоков вернутся сюда
 * вместе со своим модулем — он лежит в `to_delete/`. Записи разделов здесь
 * только читаются.
 * Ключи — те же, что у записей в админке и в журнале (`2`): по ним привязку
 * и открывают.
 */
@Injectable()
export class LinkTargetsService {
  constructor(
    @InjectModel(Pages) private readonly pageRepo: typeof Pages,
    @InjectModel(Contents) private readonly contentRepo: typeof Contents,
    @InjectModel(ContentItems) private readonly contentItemRepo: typeof ContentItems,
    @InjectModel(Roles) private readonly roleRepo: typeof Roles,
    @InjectModel(Products) private readonly productRepo: typeof Products,
    @InjectModel(ProductCategories) private readonly categoryRepo: typeof ProductCategories,
    @InjectModel(Forms) private readonly formRepo: typeof Forms,
    @InjectModel(FormFields) private readonly formFieldRepo: typeof FormFields,
  ) {}

  /**
   * Записи только тех списков, что спросили: поле привязки смотрит в один
   * список, и тянуть ради него все записи панели — значит повесить выбор,
   * когда записей станет много. Не спросили ни одного — ничего и не отдаём.
   */
  async findAll(
    listKeys: string[],
    transaction?: Transaction,
  ): Promise<LinkTargetDto[]> {
    const wanted = new Set(listKeys);
    const itemTypeIds = listKeys
      .filter((key) => key.startsWith(`${CONTENT_ITEMS_KIND}.`))
      .map((key) => Number(key.slice(CONTENT_ITEMS_KIND.length + 1)))
      .filter((id) => Number.isInteger(id) && id > 0);
    // Типы нужны и самим по себе, и элементам: группа элементов подписана путём типа
    const isTypesNeeded = wanted.has(CONTENTS_LIST) || itemTypeIds.length > 0;

    const byName = [['name', 'ASC'], ['id', 'ASC']] as [string, string][];
    const when = <T>(isWanted: boolean, load: () => Promise<T[]>): Promise<T[]> =>
      isWanted ? load() : Promise.resolve([]);
    const [pages, contentTypes, contentItems, roles, products, categories, forms, formFields] = await Promise.all([
      when(wanted.has('pages'), () =>
        this.pageRepo.findAll({ order: [['sort', 'ASC']], transaction }),
      ),
      when(isTypesNeeded, () => this.contentRepo.findAll({ order: byName, transaction })),
      when(itemTypeIds.length > 0, () =>
        this.contentItemRepo.findAll({
          where: { contentId: itemTypeIds },
          order: byName,
          transaction,
        }),
      ),
      when(wanted.has('roles'), () => this.roleRepo.findAll({ order: [['id', 'ASC']], transaction })),
      when(wanted.has(PRODUCTS_LIST), () =>
        this.productRepo.findAll({ order: byName, transaction }),
      ),
      when(wanted.has(CATEGORIES_LIST), () =>
        this.categoryRepo.findAll({ order: [['name', 'ASC']], transaction }),
      ),
      // Формы и их поля общие на сайт — владельца у них нет
      when(wanted.has(FORMS_LIST), () => this.formRepo.findAll({ order: [['name', 'ASC']], transaction })),
      when(wanted.has(FORM_FIELDS_LIST), () =>
        this.formFieldRepo.findAll({ order: [['name', 'ASC']], transaction }),
      ),
    ]);
    const types = contentTypesInTreeOrder(contentTypes);

    return [
      ...pages.map((page) => ({
        listKey: 'pages',
        recordId: String(page.id),
        parentId: keyOf(page.parentId),
        name: page.name,
        code: page.code || null,
        group: 'Страницы',
      })),
      // Элементы каждого типа — своей группой: «Новости» и «Статьи» не смешиваются.
      // Группа подписана путём типа от корня — вложенный тип без родителя не узнать
      ...types.flatMap(({ type, path }) =>
        contentItems
          .filter((item) => item.contentId === type.id)
          .map((item) => ({
            listKey: contentItemsList(type.id),
            recordId: String(item.id),
            parentId: keyOf(item.parentId),
            name: item.name,
            code: item.code || null,
            group: `Контент: ${contentTypePath(path)}`,
          })),
      ),
      // Сами типы — для привязки к типу контента; в привязку к записям не попадают.
      // Их структуру выбор рисует деревом по `parentId`
      ...(wanted.has(CONTENTS_LIST) ? types : []).map(({ type }) => ({
        listKey: CONTENTS_LIST,
        recordId: String(type.id),
        parentId: keyOf(type.parentId),
        name: type.name,
        code: type.code || null,
        group: 'Типы контента',
      })),
      ...roles.map((role) => ({
        listKey: 'roles',
        recordId: String(role.id),
        parentId: null,
        name: role.name,
        code: null,
        group: 'Роли',
      })),
      ...products.map((product) => ({
        listKey: PRODUCTS_LIST,
        recordId: String(product.id),
        parentId: null,
        name: product.name,
        code: product.code || null,
        group: 'Товары',
      })),
      ...categories.map((category) => ({
        listKey: CATEGORIES_LIST,
        recordId: String(category.id),
        parentId: keyOf(category.parentId),
        name: category.name,
        code: category.code || null,
        group: 'Категории товаров',
      })),
      ...forms.map((form) => ({
        listKey: FORMS_LIST,
        recordId: String(form.id),
        parentId: null,
        name: form.name,
        code: form.code,
        group: 'Формы обратной связи',
      })),
      ...formFields.map((field) => ({
        listKey: FORM_FIELDS_LIST,
        recordId: String(field.id),
        parentId: null,
        name: field.name,
        code: field.code,
        group: 'Поля форм',
      })),
    ];
  }

  /**
   * Списки, из которых привязка может брать записи. Перечислены все — в том
   * числе пустые: свойство настраивают раньше, чем наполняют список, и выбрать
   * его должно быть можно сразу. Каждый тип контента — отдельным источником:
   * привязывают к элементам одного типа («Новости»), а не к типу. Типы идут
   * группой «Контент» и деревом: у вложенного — ключ родителя (`parentKey`).
   *
   * Формы обратной связи и поля форм отсюда убраны, пока раздел скрыт
   * во фронтенде (`to_delete/feedback/`): новое свойство к ним не привязать.
   * Записи их `findAll` отдаёт по-прежнему — на них держатся системное
   * «Поля» у форм и уже заведённые привязки.
   */
  async findSources(transaction?: Transaction): Promise<LinkSourceDto[]> {
    const contentTypes = await this.contentRepo.findAll({
      order: [['name', 'ASC'], ['id', 'ASC']],
      transaction,
    });
    const top = (listKey: string, name: string): LinkSourceDto => ({
      id: null,
      listKey,
      name,
      group: null,
      parentKey: null,
    });
    const ids = new Set(contentTypes.map((type) => type.id));
    return [
      top('pages', 'Страницы'),
      ...contentTypesInTreeOrder(contentTypes).map(({ type, path }) => ({
        id: type.id,
        listKey: contentItemsList(type.id),
        name: type.name,
        // Полное имя — для закрытого выбора, где дерева уже не видно
        label: `Контент: ${contentTypePath(path)}`,
        group: 'Контент',
        parentKey:
          type.parentId !== null && ids.has(type.parentId) ? contentItemsList(type.parentId) : null,
      })),
      top('roles', 'Роли пользователей'),
      top(PRODUCTS_LIST, 'Товары'),
      top(CATEGORIES_LIST, 'Категории товаров'),
    ];
  }

  /** Привязывать можно только к своим существующим записям. */
  async assertExist(links: ContentLink[], transaction?: Transaction): Promise<void> {
    if (links.length === 0) return;
    const listKeys = Array.from(new Set(links.map((link) => link.listKey)));
    const known = new Set((await this.findAll(listKeys, transaction)).map(linkKey));
    const missing = links.filter((link) => !known.has(linkKey(link)));
    if (missing.length) {
      throw new BadRequestException(
        `Привязанная запись не найдена: ${missing.map(linkKey).join(', ')}`,
      );
    }
  }
}

/** Родитель записи — ключом записи в том же списке; нет родителя — null. */
const keyOf = (parentId: number | null): string | null =>
  parentId === null ? null : String(parentId);
