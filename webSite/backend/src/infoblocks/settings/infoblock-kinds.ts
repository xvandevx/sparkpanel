import { BadRequestException } from '@nestjs/common';
import { PAGES_ENTITY } from '../pages/pages.service';
import { USERS_ENTITY } from '../../users/users.service';
import { ROLES_ENTITY } from '../roles/roles.service';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../products/product-lists';
import { FORM_FIELDS_LIST, FORMS_LIST } from '../forms/form-lists';
import { CONTENT_ITEMS_KIND, CONTENTS_LIST } from '../contents/content-lists';
import { SITE_OWNER } from './settings.model';

/**
 * Списки, у которых бывают настройки. Ключ списка — вид, а у вложенных списков
 * ещё и номер владельца через точку: `pages`, `infoblock-elements.3` — записи
 * инфоблока 3. Так у записей «Новостей» и «Товаров» свои свойства.
 *
 * Вид знает, в какой журнал писать правки свойств: история записи одна, и смена
 * цены товара должна быть видна там же, где смена его названия.
 *
 * Перечислены только живые разделы: инфоблоки лежат в `to_delete/`
 * и вернутся сюда вместе со своим модулем. Настройки их
 * списков из базы никуда не делись — просто пока не читаются.
 */
interface InfoblockKind {
  /**
   * Тип записи в журнале изменений; null — у раздела журнала нет. У вложенного
   * вида журнал у каждого списка свой: тип записи — полный ключ списка
   */
  entity: string | null;
  /** Список вложенный: у ключа обязателен номер владельца */
  scoped: boolean;
  /**
   * Список — часть управления панелью: его настройки, свойства, вкладки
   * и значения записей правит, а журнал видит только главный администратор
   */
  isRootOnly?: boolean;
  /**
   * Уровней вложенности, пока настройки списка не сохраняли; он же решает,
   * дерево ли список: 1 — плоский, больше или null (без ограничения) — дерево.
   * Не задан — 1: список плоский, пока его не сделали деревом.
   */
  maxDepth?: number | null;
  /**
   * Имя списка, пока его не задали в настройках: оно заголовком стоит над
   * таблицей раздела. Без него заголовком был бы ключ списка
   */
  name?: string;
  /**
   * У записей списка черновиков не бывает: файл заменяют загрузкой, а учётные
   * записи, роли, домены и типы контента — устройство панели и сайта, а не его
   * контент: публиковать их некуда.
   * У остальных черновики включают в настройках списка
   */
  isDraftless?: boolean;
  /**
   * Свойств у записей списка не бывает: файл — это сам файл и его имя,
   * описывать его свойствами панель не даёт
   */
  isPropertyless?: boolean;
}

const INFOBLOCK_KINDS: Record<string, InfoblockKind> = {
  // Страницы вкладываются друг в друга по самой своей природе — дерево без предела
  pages: {
    entity: PAGES_ENTITY,
    scoped: false,
    maxDepth: null,
    name: 'Страницы',
  },
  // Учётные записи и роли — управление панелью: правит их только root
  users: {
    entity: USERS_ENTITY,
    scoped: false,
    isRootOnly: true,
    name: 'Пользователи',
    isDraftless: true,
  },
  roles: {
    entity: ROLES_ENTITY,
    scoped: false,
    isRootOnly: true,
    name: 'Роли',
    isDraftless: true,
  },
  // Товары — плоский список; категории товаров — дерево без предела, пока его
  // не ограничили в настройках. Категории товару назначает системное свойство
  [PRODUCTS_LIST]: { entity: PRODUCTS_LIST, scoped: false, name: 'Товары' },
  [CATEGORIES_LIST]: {
    entity: CATEGORIES_LIST,
    scoped: false,
    maxDepth: null,
    name: 'Категории',
  },
  // Формы обратной связи и их поля — два плоских списка. Поля форме подключает
  // системное свойство «Поля», поэтому одно поле живёт в нескольких формах.
  // Формы — контент сайта, общий на всех, кто им управляет: и свойства одни на всех
  [FORMS_LIST]: {
    entity: FORMS_LIST,
    scoped: false,
    name: 'Формы обратной связи',
  },
  [FORM_FIELDS_LIST]: {
    entity: FORM_FIELDS_LIST,
    scoped: false,
    name: 'Поля форм',
  },
  // Типы контента и элементы одного типа (`content-items.3`): у элементов
  // каждого типа свои свойства и свой журнал
  [CONTENTS_LIST]: {
    entity: CONTENTS_LIST,
    scoped: false,
    name: 'Типы контента',
    // Тип — структура разделов, а не контент: черновики бывают у его элементов
    isDraftless: true,
  },
  [CONTENT_ITEMS_KIND]: {
    entity: CONTENT_ITEMS_KIND,
    scoped: true,
    name: 'Элементы',
  },
  // Разделы файлов и файлы одного раздела (`files.10`): журнала у них нет —
  // правки никуда не пишутся. Свойства бывают у разделов, у файлов — нет
  'file-sections': { entity: null, scoped: false, maxDepth: 2, name: 'Файлы', isDraftless: true },
  files: {
    entity: null,
    scoped: true,
    name: 'Файлы раздела',
    isDraftless: true,
    isPropertyless: true,
  },
  // Файлы, загруженные через свойство «Файл»/«Изображение» (`property-files.6`):
  // раздела под них в базе нет, «Файлы» показывают их по свойству
  'property-files': {
    entity: null,
    scoped: true,
    name: 'Файлы свойства',
    isDraftless: true,
    isPropertyless: true,
  },
  // Внешние хранилища файлов — список редактора в настройках сайта, без журнала.
  // Общие на сайт: по их свойствам (адрес, ключи) сервер ходит в S3 за любого
  storages: { entity: null, scoped: false, name: 'Внешние хранилища' },
  // Домены сайта — тоже в настройках и тоже без журнала: дерево «домен → поддомены».
  // Общие на сайт, поэтому и свойства доменов одни на всех
  domains: {
    entity: null,
    scoped: false,
    maxDepth: 2,
    name: 'Домены',
    isDraftless: true,
  },
};

const LIST_KEY_PATTERN = /^([a-z][a-z-]*)(?:\.([1-9][0-9]{0,9}))?$/;

/**
 * Ключ записи — тот же, что у неё в журнале и в адресе админки: `2`,
 * `element-3`, `form-1`. Для модуля он непрозрачен, проверяется только формат.
 */
const RECORD_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface ResolvedInfoblock {
  key: string;
  /** Вид списка — ключ без номера владельца: `infoblock-elements.3` → `infoblock-elements` */
  kind: string;
  entity: string | null;
  isRootOnly: boolean;
  /** Уровней вложенности по умолчанию; 1 — плоский список, null — дерево без ограничения */
  maxDepth: number | null;
}

/** Ключ списка → его вид. Незнакомый или неполный ключ — 400: писать «куда-нибудь» нельзя. */
export function resolveInfoblock(key: string): ResolvedInfoblock {
  const match = LIST_KEY_PATTERN.exec(key);
  const kind = match ? INFOBLOCK_KINDS[match[1]] : undefined;
  if (!match || !kind || kind.scoped !== Boolean(match[2])) {
    throw new BadRequestException(`Неизвестный список: ${key}`);
  }
  return {
    key,
    kind: match[1],
    // Журнал вложенного списка — только его записи: правки новостей не мешаются со статьями
    entity: kind.entity !== null && kind.scoped ? key : kind.entity,
    isRootOnly: kind.isRootOnly === true,
    maxDepth: kind.maxDepth === undefined ? 1 : kind.maxDepth,
  };
}

/**
 * Уровней вложенности списка: сохранённый в настройках, а настроек нет —
 * по умолчанию вида. Сохранённый `null` — осознанное «дерево без ограничения».
 */
export function listMaxDepth(
  settings: { maxDepth: number | null } | null,
  listKey: string,
): number | null {
  return settings
    ? (settings.maxDepth ?? null)
    : resolveInfoblock(listKey).maxDepth;
}

/** Имя списка, пока его не задали в настройках: по виду, а нет у вида — ключ списка. */
export function listDefaultName(listKey: string): string {
  return INFOBLOCK_KINDS[resolveInfoblock(listKey).kind].name ?? listKey;
}

/** Вид вложенный: его списки — `вид.номер`, а не сам вид. */
export const isScopedKind = (kind: string): boolean =>
  INFOBLOCK_KINDS[kind]?.scoped === true;

// Владелец настроек списков — рядом с моделью настроек (см. там почему)
export { SITE_OWNER };

/**
 * Есть ли у списка журнал изменений. Правки пишутся в общую таблицу
 * `history` под типом записи вида; нет типа — нет и журнала
 * (медиатека: её правки не пишутся никуда).
 */
export function hasJournal(key: string): boolean {
  return resolveInfoblock(key).entity !== null;
}

/** Черновики у записей списка бывают — если их включат в настройках. */
export function hasDrafts(key: string): boolean {
  return INFOBLOCK_KINDS[resolveInfoblock(key).kind].isDraftless !== true;
}

/** Свойства у записей списка бывают: у файлов их нет. */
export function hasProperties(key: string): boolean {
  return INFOBLOCK_KINDS[resolveInfoblock(key).kind].isPropertyless !== true;
}

export function assertRecordId(recordId: string): void {
  if (!RECORD_ID_PATTERN.test(recordId)) {
    throw new BadRequestException(`Неверный ключ записи: ${recordId}`);
  }
}
