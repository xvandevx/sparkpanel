/**
 * Имя и адрес домена. Чистые функции — без базы.
 *
 * Запись хранит ровно то, что набрали: у домена — его имя (`farkop.ru`),
 * у поддомена — только своё (`ekb`). Полный адрес (`ekb.farkop.ru`) не хранится,
 * а складывается из имён по цепочке родителей: переименовали домен — адреса
 * поддоменов поменялись сами, переписывать нечего.
 */

/** Имя хоста: латинские буквы, цифры и дефисы, точки между частями, необязательный порт. */
export const DOMAIN_NAME_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/;

export const DOMAIN_NAME_MESSAGE = 'Домен указан неверно — пример: farkop.ru';

/**
 * Введённое — к имени хоста: без пробелов, регистра, протокола и пути.
 * Адрес обычно копируют из адресной строки, и отказывать из-за `https://`
 * незачем: нормализуем до проверки, а она ловит уже настоящие опечатки.
 */
export const normalizeDomainName = (value: unknown): unknown =>
  typeof value !== 'string'
    ? value
    : value
        .trim()
        .toLowerCase()
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
        .replace(/[/?#].*$/, '');

export interface DomainRow {
  id: number;
  parentId: number | null;
  name: string;
}

/** Полные адреса всех записей: имя и адреса родителей через точку. Кольцо не зацикливает. */
export function domainAddresses(rows: DomainRow[]): Map<number, string> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const addressOf = (row: DomainRow): string => {
    const parts = [row.name];
    const seen = new Set([row.id]);
    let parent = row.parentId === null ? undefined : byId.get(row.parentId);
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id);
      parts.push(parent.name);
      parent = parent.parentId === null ? undefined : byId.get(parent.parentId);
    }
    return parts.join('.');
  };
  return new Map(rows.map((row) => [row.id, addressOf(row)]));
}

/**
 * Годится ли имя на своём месте. У поддомена — только своё имя: набрали
 * `ekb.farkop.ru` под `farkop.ru` — адрес вышел бы `ekb.farkop.ru.farkop.ru`.
 * Сложенный адрес тоже должен быть именем хоста: порт бывает только в конце.
 * Возвращает текст ошибки или null.
 */
export function domainNameError(
  name: string,
  address: string,
  parentAddress: string | null,
): string | null {
  if (parentAddress !== null && (name === parentAddress || name.endsWith(`.${parentAddress}`))) {
    const short = name.slice(0, -parentAddress.length - 1);
    return short
      ? `У поддомена указывается только его имя: ${short}, без .${parentAddress}`
      : `Укажите имя поддомена — например, msk для msk.${parentAddress}`;
  }
  if (address.length > 255 || !DOMAIN_NAME_PATTERN.test(address)) return DOMAIN_NAME_MESSAGE;
  return null;
}

/**
 * Адрес, который после правки встретится дважды, или null. Смотрим только
 * на записи, чей адрес правка поменяла: переименование домена меняет адреса
 * и всем его поддоменам.
 */
export function duplicateAddress(
  before: Map<number, string>,
  after: Map<number, string>,
): string | null {
  const counts = new Map<string, number>();
  after.forEach((address) => counts.set(address, (counts.get(address) ?? 0) + 1));
  for (const [id, address] of after) {
    if (before.get(id) !== address && (counts.get(address) ?? 0) > 1) return address;
  }
  return null;
}
