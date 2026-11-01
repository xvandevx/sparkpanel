import { BadRequestException } from '@nestjs/common';
import { gunzipSync } from 'zlib';

/**
 * Копия базы целиком: строки каждой таблицы, как их отдаёт `json_agg`.
 * Схемы в копии нет — её задают модели, и при старте сервера база
 * приводится к ним сама; возвращаются только данные.
 */
export interface SiteDump {
  format: typeof SITE_DUMP_FORMAT;
  version: typeof SITE_DUMP_VERSION;
  tables: Record<string, Record<string, unknown>[]>;
}

export const SITE_DUMP_FORMAT = 'sparkpanel-site';
export const SITE_DUMP_VERSION = 1;

/** Таблица самих копий: в копию не попадает и восстановлением не стирается. */
export const SITE_BACKUPS_TABLE = 'site_backups';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Первые байты gzip: файл копии скачивается сжатым, но и просто JSON принимаем. */
const isGzip = (file: Buffer): boolean => file[0] === 0x1f && file[1] === 0x8b;

/** Файл копии — в копию; не копия сайта — 400. */
export function parseSiteDump(file: Buffer): SiteDump {
  let raw: unknown;
  try {
    raw = JSON.parse((isGzip(file) ? gunzipSync(file) : file).toString('utf8'));
  } catch {
    throw new BadRequestException('Файл не читается как копия сайта');
  }
  if (
    !isObject(raw) ||
    raw.format !== SITE_DUMP_FORMAT ||
    raw.version !== SITE_DUMP_VERSION ||
    !isObject(raw.tables)
  ) {
    throw new BadRequestException('Это не копия сайта SparkPanel');
  }
  for (const rows of Object.values(raw.tables)) {
    if (!Array.isArray(rows) || !rows.every(isObject)) {
      throw new BadRequestException('Копия сайта повреждена');
    }
  }
  return raw as unknown as SiteDump;
}

export const rowsCount = (dump: SiteDump): number =>
  Object.values(dump.tables).reduce((sum, rows) => sum + rows.length, 0);

/** Колонки строк копии: у `json_agg` они одни у всех строк, но собираем со всех. */
export function columnsOf(rows: Record<string, unknown>[]): string[] {
  const names = new Set<string>();
  for (const row of rows) for (const name of Object.keys(row)) names.add(name);
  return [...names];
}

/**
 * Порядок заливки таблиц: та, на которую ссылаются, — раньше ссылающейся,
 * иначе внешний ключ не пропустит строку. Ссылка таблицы на саму себя
 * порядок не задаёт. Кольцо ссылок (в схеме его нет) — оставшиеся таблицы
 * идут как есть, и тогда ошибку покажет сама база.
 */
export function tableOrder(
  tables: string[],
  references: { table: string; ref: string }[],
): string[] {
  const known = new Set(tables);
  const needs = new Map(tables.map((table) => [table, new Set<string>()]));
  for (const { table, ref } of references) {
    if (table !== ref && known.has(table) && known.has(ref)) needs.get(table)?.add(ref);
  }

  const order: string[] = [];
  const placed = new Set<string>();
  while (order.length < tables.length) {
    const ready = tables.filter(
      (table) => !placed.has(table) && [...(needs.get(table) ?? [])].every((ref) => placed.has(ref)),
    );
    const next = ready.length > 0 ? ready : tables.filter((table) => !placed.has(table));
    for (const table of next) {
      order.push(table);
      placed.add(table);
    }
  }
  return order;
}
