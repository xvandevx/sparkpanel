import { BadRequestException } from '@nestjs/common';
import { CONTENT_ITEMS_KIND, CONTENTS_LIST } from '../infoblocks/contents/content-lists';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../infoblocks/products/product-lists';
import { resolveInfoblock } from '../infoblocks/settings/infoblock-kinds';

/**
 * Какие списки панели видит ассистент и через какие маршруты разделов их
 * пишет. MCP ходит в те же маршруты, что и экраны панели (`common/panel-client.ts`),
 * поэтому здесь только адреса и подсказки о полях — проверки у разделов.
 *
 * Чего здесь нет, того ассистент не видит: пользователи, роли и хранилища —
 * управление панелью, формы обратной связи пока скрыты и в самой панели.
 */

/** Поле записи раздела (не свойство): ключ в `fields` и что в нём. */
export interface McpField {
  key: string;
  note: string;
}

interface McpKind {
  /** Маршрут раздела от `/api`: создают — POST сюда, правят — PATCH `/:id`, удаляют — DELETE `/:id` */
  path: (owner: number) => string;
  fields: McpField[];
  /**
   * Родитель — поле самого раздела. Нет — дерево списка, включённое настройкой,
   * и родитель уходит вместе со значениями свойств
   */
  isOwnParent: boolean;
  /** Записи заводятся обычным созданием; файлы — только загрузкой */
  canCreate: boolean;
}

const PARENT: McpField = { key: 'parentId', note: 'Номер родителя в дереве; null — в корень' };
const NAME: McpField = { key: 'name', note: 'Название, обязательно' };
const CODE: McpField = { key: 'code', note: 'Символьный код: строчная латиница, цифры, дефис' };
const ACTIVE: McpField = { key: 'isActive', note: 'Активна ли запись; неактивную сайт не видит' };
const SORT: McpField = { key: 'sort', note: 'Сортировка, по умолчанию 500: меньше — выше' };
const EXTERNAL: McpField = {
  key: 'externalId',
  note: 'Внешний ID — номер записи в системе-источнике, уникален в списке; "" или null — стереть. Пишется сразу, не в черновик',
};

const MCP_KINDS: Record<string, McpKind> = {
  pages: {
    path: () => '/infoblocks/pages',
    fields: [PARENT, NAME, { ...CODE, note: `${CODE.note}; у вложенной страницы обязателен` }, ACTIVE, SORT, EXTERNAL],
    isOwnParent: true,
    canCreate: true,
  },
  [CONTENTS_LIST]: {
    path: () => '/infoblocks/contents',
    fields: [PARENT, NAME, { ...CODE, note: `${CODE.note}; обязателен — по нему тип виден во внешнем API` }, ACTIVE, SORT, EXTERNAL],
    isOwnParent: true,
    canCreate: true,
  },
  [CONTENT_ITEMS_KIND]: {
    path: (contentId) => `/infoblocks/contents/${contentId}/items`,
    fields: [PARENT, NAME, CODE, ACTIVE, SORT, EXTERNAL],
    isOwnParent: true,
    canCreate: true,
  },
  [PRODUCTS_LIST]: {
    path: () => '/infoblocks/products',
    fields: [NAME, CODE, ACTIVE, SORT, EXTERNAL],
    isOwnParent: false,
    canCreate: true,
  },
  [CATEGORIES_LIST]: {
    path: () => '/infoblocks/products/categories',
    fields: [PARENT, NAME, CODE, ACTIVE, SORT, EXTERNAL],
    isOwnParent: true,
    canCreate: true,
  },
  'file-sections': {
    path: () => '/infoblocks/files/sections',
    fields: [PARENT, NAME, SORT, EXTERNAL],
    isOwnParent: true,
    canCreate: true,
  },
  files: {
    path: () => '/infoblocks/files',
    fields: [{ key: 'name', note: 'Имя файла в панели' }],
    isOwnParent: true,
    canCreate: false,
  },
  domains: {
    path: () => '/infoblocks/domains',
    fields: [
      { ...PARENT, note: 'Номер домена у поддомена; null — домен' },
      { key: 'name', note: 'Хост домена (farkop.ru) или только часть поддомена (ekb)' },
      ACTIVE,
      SORT,
      EXTERNAL,
    ],
    isOwnParent: true,
    canCreate: true,
  },
};

export interface McpList extends McpKind {
  key: string;
  kind: string;
  /** Номер владельца у вложенного списка: тип контента, раздел файлов; у остальных 0 */
  owner: number;
}

/** Ключ списка → как с ним работать. Чужой список — 400 с перечнем, что можно. */
export function mcpList(listKey: string): McpList {
  const { key, kind } = resolveInfoblockOrNull(listKey) ?? { key: listKey, kind: '' };
  const found = MCP_KINDS[kind];
  if (!found) {
    throw new BadRequestException(`Список ${listKey} через MCP недоступен — какие есть, покажет list_lists`);
  }
  return { ...found, key, kind, owner: Number(key.split('.')[1] ?? 0) };
}

const resolveInfoblockOrNull = (listKey: string) => {
  try {
    return resolveInfoblock(listKey);
  } catch {
    return null;
  }
};
