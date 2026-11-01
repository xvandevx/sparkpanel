import type { FileDto, FileSectionDto } from '../../src/api/client';

/**
 * Выбор файла из загруженных: дерево разделов и файлы, из которых выбирают.
 * Чистые функции — ни React, ни сети; рисует их шторка выбора в карточке записи.
 */

/** Узел дерева разделов в том виде, в каком его ждёт `Tree` antd: данные, не разметка. */
export interface SectionNode {
  key: string;
  title: string;
  /** false — группа разделов свойств: файлов в ней нет, выбирать нечего */
  selectable?: boolean;
  children?: SectionNode[];
}

/** «Все файлы» в дереве: выбор без раздела. */
export const ALL_SECTIONS = '';

/**
 * Разделы деревом по `parentId`, по алфавиту, а сверху — «Все файлы».
 * Раздел с пропавшим родителем встаёт в корень: терять его из выбора нельзя.
 */
export function sectionTree(sections: FileSectionDto[]): SectionNode[] {
  const byParent = new Map<string | null, FileSectionDto[]>();
  const ids = new Set(sections.map((section) => section.id));
  for (const section of sections) {
    const parent = section.parentId !== null && ids.has(section.parentId) ? section.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), section]);
  }

  const build = (parent: string | null, seen: Set<string>): SectionNode[] =>
    (byParent.get(parent) ?? [])
      .filter((section) => !seen.has(section.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((section) => {
        const children = build(section.id, new Set(seen).add(section.id));
        return {
          key: section.id,
          ...(section.isGroup
            ? { title: section.name, selectable: false }
            : { title: `${section.name} (${section.filesCount})` }),
          ...(children.length > 0 ? { children } : {}),
        };
      });

  return [{ key: ALL_SECTIONS, title: 'Все файлы' }, ...build(null, new Set())];
}

/** Ключи всех узлов дерева — чтобы показать его раскрытым целиком. */
export const treeKeys = (nodes: SectionNode[]): string[] =>
  nodes.flatMap((node) => [node.key, ...treeKeys(node.children ?? [])]);

/** С какого раздела открыть выбор: раздела свойства, а его ещё нет — со всех файлов. */
export const startSection = (sections: FileSectionDto[], propertyId: number | null): string => {
  const own = sections.find((section) => propertyId !== null && section.propertyId === propertyId);
  return own ? String(own.id) : ALL_SECTIONS;
};

/**
 * Номер раздела, где показан файл: загруженный через свойство — в разделе
 * свойства (`property-6`, как его номерует сервер), остальной — в своём.
 */
const fileSectionId = (file: FileDto): string =>
  file.propertyId !== null ? `property-${file.propertyId}` : String(file.sectionId);

/**
 * Файлы, из которых выбирают: раздела (или все), найденные по имени и описанию,
 * ещё не выбранные и, у поля изображения, только картинки. Неподходящие по
 * формату и весу остаются в списке — их закрывает шторка с причиной
 * (`pickError`): спрятанный файл не объяснил бы, куда делся.
 */
export const pickerFiles = (
  files: FileDto[],
  {
    section,
    query,
    chosen,
    isImageOnly,
  }: { section: string; query: string; chosen: number[]; isImageOnly: boolean },
): FileDto[] => {
  const search = query.trim().toLowerCase();
  return files.filter(
    (file) =>
      (section === ALL_SECTIONS || fileSectionId(file) === section) &&
      !chosen.includes(file.id) &&
      (!isImageOnly || file.isImage) &&
      (search === '' || file.name.toLowerCase().includes(search)),
  );
};
