import { ConflictException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CONTENT_ITEMS_KIND, CONTENTS_LIST } from '../../infoblocks/contents/content-lists';
import { CATEGORIES_LIST, PRODUCTS_LIST } from '../../infoblocks/products/product-lists';
import { resolveInfoblock } from '../../infoblocks/settings/infoblock-kinds';
import { PropertyValuesService } from '../../infoblocks/values/property-values.service';

/** Таблица раздела: где лежат записи списка и есть ли у них код. */
interface SectionTable {
  table: string;
  /** Колонка владельца у вложенного списка: элементы — тип контента */
  owner?: string;
  hasCode: boolean;
}

/**
 * Таблицы разделов, которые пишет внешнее API, плюс типы контента — на них
 * ссылается привязка к типу. Другие списки (роли, формы) по коду не ищутся:
 * привязку к ним задают номером или внешним ID.
 */
const TABLES: Record<string, SectionTable> = {
  pages: { table: 'infoblock_pages', hasCode: true },
  [CONTENTS_LIST]: { table: 'infoblock_contents', hasCode: true },
  [CONTENT_ITEMS_KIND]: { table: 'infoblock_contents_items', owner: 'contentId', hasCode: true },
  [PRODUCTS_LIST]: { table: 'infoblock_products', hasCode: true },
  [CATEGORIES_LIST]: { table: 'infoblock_products_categories', hasCode: true },
  domains: { table: 'infoblock_domains', hasCode: false },
};

export type RecordRow = Record<string, unknown> & { id: number };

/**
 * Поиск одной записи списка запросом к базе — по номеру, коду или внешнему
 * ID. Запись по API приходит пачками в десятки тысяч, и читать список
 * целиком ради одной записи (как читает его страница таблицы) нельзя: время
 * росло бы вместе со списком. Код и внешний ID — по индексам.
 */
@Injectable()
export class RecordLookupService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly values: PropertyValuesService,
  ) {}

  /** Строка записи из таблицы раздела; нет такой в этом списке — null. */
  async row(listKey: string, id: number): Promise<RecordRow | null> {
    const { table, scope, replacements } = this.tableOf(listKey);
    const [row] = await this.sequelize.query<RecordRow>(
      `SELECT * FROM "${table.table}" WHERE id = :id${scope} LIMIT 1`,
      { replacements: { ...replacements, id }, type: QueryTypes.SELECT },
    );
    return row ?? null;
  }

  /**
   * Номер записи по коду; нет — null. Код бывает неуникальным (у страниц —
   * только среди соседей), и тогда по нему не понять, какую запись правят, — 409.
   */
  async idByCode(listKey: string, code: string): Promise<number | null> {
    const { table, scope, replacements } = this.tableOf(listKey);
    if (!table.hasCode || code === '') return null;
    const rows = await this.sequelize.query<{ id: number }>(
      `SELECT id FROM "${table.table}" WHERE code = :code${scope} LIMIT 2`,
      { replacements: { ...replacements, code }, type: QueryTypes.SELECT },
    );
    if (rows.length > 1) throw new ConflictException(`Код «${code}» у нескольких записей — укажите номер`);
    return rows[0]?.id ?? null;
  }

  /** Номер записи по внешнему ID — у любого списка; нет — null. */
  async idByExternalId(listKey: string, externalId: string): Promise<number | null> {
    const recordId = await this.values.recordIdByExternalId(listKey, externalId);
    return recordId === null ? null : Number(recordId);
  }

  /** Внешний ID записи; нет — null. */
  externalIdOf(listKey: string, id: number): Promise<string | null> {
    return this.values.externalIdOf(listKey, String(id));
  }

  /** Ищется ли в списке запись по коду. */
  hasCode(listKey: string): boolean {
    return TABLES[resolveInfoblock(listKey).kind]?.hasCode === true;
  }

  private tableOf(listKey: string) {
    const { key, kind } = resolveInfoblock(listKey);
    const table = TABLES[kind];
    if (!table) throw new Error(`Нет таблицы для списка ${key}`);
    const owner = Number(key.split('.')[1] ?? 0);
    return table.owner
      ? { table, scope: ` AND "${table.owner}" = :owner`, replacements: { owner } }
      : { table, scope: '', replacements: {} };
  }
}
