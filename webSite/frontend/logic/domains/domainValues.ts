/**
 * Значение мультидоменного свойства: своё значение на группу доменов.
 * Первое — для всех доменов (`domainIds: null`), за ним — уникальные
 * значения: каждое для одного или нескольких доменов и поддоменов сразу.
 * Сайт на `ekb.farkop.ru` берёт уникальное, если домен есть в одной из групп;
 * нет — общее, если домена нет среди исключений общего (`exceptDomainIds`);
 * исключён — значения у него нет.
 *
 * Так значение уходит на сервер и так приходит обратно. Внутри `value` —
 * обычное значение свойства: строка, номер варианта, список у множественного.
 */
export interface DomainValue {
  /** null — для всех доменов; иначе домены, у которых это значение своё */
  domainIds: number[] | null;
  value: unknown;
  /**
   * Только у общего: «для всех, кроме» — домены, на которые общее значение
   * не распространяется. Может стоять и домен с уникальным значением:
   * уникальное сильнее, исключение срабатывает там, где его нет
   */
  exceptDomainIds?: number[];
}

/**
 * Значение свойства — в список по доменам, общее первым. Свойство могли
 * сделать мультидоменным, когда значения у записей уже были: такое значение
 * становится общим, а не теряется.
 */
export const domainValuesOf = (value: unknown): DomainValue[] => {
  if (!Array.isArray(value) || !value.every(isDomainValue)) {
    return [{ domainIds: null, value: value ?? null, exceptDomainIds: [] }];
  }
  const common = value.find((item) => item.domainIds === null);
  return [
    { domainIds: null, value: common?.value ?? null, exceptDomainIds: idsOf(common?.exceptDomainIds) },
    ...value
      .filter((item) => item.domainIds !== null)
      .map((item) => ({ domainIds: idsOf(item.domainIds), value: item.value })),
  ];
};

/** Сколько доменов со своим значением: у группы их может быть несколько. */
export const ownDomainCount = (values: DomainValue[]): number =>
  values.reduce((count, item) => count + (item.domainIds?.length ?? 0), 0);

const isDomainValue = (item: unknown): item is DomainValue =>
  typeof item === 'object' && item !== null && 'domainIds' in item && 'value' in item;

const idsOf = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id) && id > 0) : [];

/** Значения нет: пусто, пробелы или пустой список. Ноль и «выключено» — значения. */
const isBlank = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.every(isBlank));

/**
 * Домены, на которых у свойства не будет значения: нет уникального, а общее
 * пустое или домен в его исключениях. У поля, которое вовсе не заполняли,
 * список пуст — «без значения везде» там и так видно.
 */
export const uncoveredDomainIds = (values: DomainValue[], domainIds: number[]): number[] => {
  const [common, ...own] = values;
  const covered = new Set(own.filter((item) => !isBlank(item.value)).flatMap((item) => item.domainIds ?? []));
  const isCommonFilled = common !== undefined && !isBlank(common.value);
  if (!isCommonFilled && covered.size === 0) return [];
  const except = common?.exceptDomainIds ?? [];
  return domainIds.filter((id) => !covered.has(id) && (!isCommonFilled || except.includes(id)));
};
