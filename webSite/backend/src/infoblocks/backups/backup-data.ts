import { BadRequestException } from '@nestjs/common';

/** Строка таблицы в копии — как её отдала база, без модели вокруг. */
export type BackupRow = Record<string, unknown>;

/** Формат копии. Поменялся состав — растёт номер, а старые копии читает переходник. */
export const BACKUP_VERSION = 1;

/** Правила записей списка: всё из настроек, кроме имени и кода — их задаёт раздел. */
export interface BackupSettings {
  useCode: boolean;
  codeRequired: boolean;
  codeUnique: boolean;
  maxDepth: number | null;
  isHistoryEnabled: boolean;
  isDraftEnabled: boolean;
}

/**
 * Копия одного списка: его настройки и записи, строками своих таблиц.
 *
 * Номера строк сохраняются у записей раздела (`rows`, их видно в адресе
 * и на них ссылаются другие списки), вкладок, свойств и вариантов (на варианты
 * смотрят привязки других списков к значениям). Строки дерева, значений,
 * черновиков и полей фильтра при восстановлении заводятся заново — на их
 * номера никто не ссылается.
 */
export interface BackupData {
  version: number;
  listKey: string;
  settings: BackupSettings;
  tabs: BackupRow[];
  properties: BackupRow[];
  options: BackupRow[];
  filters: BackupRow[];
  /** Записи из таблицы раздела */
  rows: BackupRow[];
  /** Строки `infoblock_records`: к ним привязаны значения */
  records: BackupRow[];
  values: BackupRow[];
  drafts: BackupRow[];
}

const ROW_LISTS = [
  'tabs',
  'properties',
  'options',
  'filters',
  'rows',
  'records',
  'values',
  'drafts',
] as const;

/**
 * Копия из загруженного файла — того же формата и того же списка. Файл
 * чужого списка не читается: номера записей в нём о другом.
 */
export function parseBackupData(raw: unknown, listKey: string): BackupData {
  const data = raw as Partial<BackupData> | null;
  if (!data || typeof data !== 'object' || data.version !== BACKUP_VERSION) {
    throw new BadRequestException('Это не файл резервной копии списка');
  }
  if (data.listKey !== listKey) {
    throw new BadRequestException(
      `Копия сделана для другого списка: ${String(data.listKey)}`,
    );
  }
  if (!data.settings || typeof data.settings !== 'object') {
    throw new BadRequestException('В копии нет настроек списка');
  }
  for (const name of ROW_LISTS) {
    const rows = data[name];
    if (
      !Array.isArray(rows) ||
      rows.some((row) => !row || typeof row !== 'object')
    ) {
      throw new BadRequestException(`Копия повреждена: нет строк «${name}»`);
    }
  }
  if (data.rows!.some((row) => !Number.isInteger(row.id))) {
    throw new BadRequestException('Копия повреждена: у записи нет номера');
  }
  return data as BackupData;
}

/** Что станет с записями списка, если вернуть копию. */
export interface RecordsPlan {
  /** Есть сейчас, в копии нет — удалятся */
  removed: number[];
  /** Есть сейчас, в копии нет, но защищены от удаления (замок) — останутся */
  kept: number[];
  /** В копии есть, сейчас нет — вернутся */
  returned: number[];
}

/**
 * Защищённая запись (`isBlocked`) при восстановлении не удаляется: раздел
 * её не удаляет по своим причинам (на категорию ссылаются товары, это главный
 * администратор), и копия эти причины не отменяет.
 */
export function planRecords(
  current: { id: number | string; isBlocked?: unknown }[],
  copy: BackupRow[],
): RecordsPlan {
  const copyIds = new Set(copy.map((row) => Number(row.id)));
  const currentIds = new Set(current.map((row) => Number(row.id)));
  const absent = current.filter((row) => !copyIds.has(Number(row.id)));
  return {
    removed: absent
      .filter((row) => row.isBlocked !== true)
      .map((row) => Number(row.id)),
    kept: absent
      .filter((row) => row.isBlocked === true)
      .map((row) => Number(row.id)),
    returned: Array.from(copyIds).filter((id) => !currentIds.has(id)),
  };
}

/** Поля, которые меняются сами и о содержании записи ничего не говорят. */
const VOLATILE = new Set(['id', 'recordId', 'createdAt', 'updatedAt']);

/** Строка без служебных полей и с ключами по порядку — чтобы сравнивать текстом. */
const plain = (row: BackupRow): string =>
  JSON.stringify(
    Object.keys(row)
      .filter((key) => !VOLATILE.has(key))
      .sort()
      .map((key) => [key, row[key]]),
  );

/**
 * Отпечаток каждой записи — её поля и значения свойств, по ключу записи.
 * Даты и номера строк в него не входят: их меняет само сохранение.
 */
export function recordPrints(
  rows: BackupRow[],
  records: BackupRow[],
  values: BackupRow[],
): Map<string, string> {
  const keyById = new Map(
    records.map((record) => [Number(record.id), String(record.recordKey)]),
  );
  const valuesByKey = new Map<string, string[]>();
  for (const value of values) {
    const key = keyById.get(Number(value.recordId));
    if (key === undefined) continue;
    valuesByKey.set(key, [...(valuesByKey.get(key) ?? []), plain(value)]);
  }
  return new Map(
    rows.map((row) => {
      const key = String(row.id);
      return [
        key,
        `${plain(row)}|${(valuesByKey.get(key) ?? []).sort().join(',')}`,
      ];
    }),
  );
}

/** Сколько записей есть и там, и там, но отличаются полями или значениями. */
export function changedCount(
  current: Map<string, string>,
  copy: Map<string, string>,
): number {
  let count = 0;
  copy.forEach((print, key) => {
    const now = current.get(key);
    if (now !== undefined && now !== print) count += 1;
  });
  return count;
}

/**
 * Родитель, которого нет среди записей списка, — запись поднимается в корень.
 * Так бывает, когда копия вернула ветку, а её родителя с тех пор удалили, или
 * осталась защищённая запись, а родителя копия убрала.
 */
export function orphanIds(
  rows: { id: number; parentId: number | null }[],
): number[] {
  const ids = new Set(rows.map((row) => row.id));
  return rows
    .filter((row) => row.parentId !== null && !ids.has(row.parentId))
    .map((row) => row.id);
}
