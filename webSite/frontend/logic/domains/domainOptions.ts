import type { EditorDomain } from '../../redux/action-creaters/contentEditorNew';

/** Домен в выборе: номер и полный адрес. */
export interface DomainOption {
  value: number;
  label: string;
}

/**
 * Домены для выбора — деревом, как в «Настройках» → «Домены»: домен, сразу
 * под ним его поддомены. Подпись — полный адрес: `ekb` без домена ни о чём
 * не говорит. Выключенный домен в выборе остаётся — значение для него
 * пригодится, когда его включат, — но помечен.
 */
export const domainOptions = (domains: EditorDomain[]): DomainOption[] => {
  const byAddress = (a: EditorDomain, b: EditorDomain) => a.address.localeCompare(b.address);
  const option = (domain: EditorDomain): DomainOption => ({
    value: domain.id,
    label: domain.isActive ? domain.address : `${domain.address} (выключен)`,
  });
  return domains
    .filter((domain) => domain.parentId === null)
    .sort(byAddress)
    .flatMap((root) => [
      option(root),
      ...domains
        .filter((domain) => domain.parentId === root.id)
        .sort(byAddress)
        .map(option),
    ]);
};

/**
 * Что можно выбрать в строке уникального значения: домены, которых нет
 * в других строках, плюс уже выбранные в этой. Уникальное значение у домена
 * одно — вторая строка для него спорила бы с первой.
 */
export const freeDomainOptions = (
  options: DomainOption[],
  takenIds: (number | null)[],
  ownIds: (number | null)[],
): DomainOption[] =>
  options.filter((option) => ownIds.includes(option.value) || !takenIds.includes(option.value));

/** Адреса доменов по номерам — для подписи «на … значения нет». */
export const domainLabels = (options: DomainOption[], ids: number[]): string[] =>
  ids.map((id) => options.find((option) => option.value === id)?.label ?? `домен ${id}`);
