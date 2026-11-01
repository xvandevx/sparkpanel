import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import type { UploadTarget } from '../../api/files';
import type { AppDispatch } from '../../redux';
import { reloadEditorPageThunk } from '../../redux/action-creaters/contentEditorNew';
import type { FileSectionDto } from '../../src/api/client';
import { ListKey } from '../listSettings';
import { sectionFilesApi } from './sectionFilesApi';
import { useFileSections } from './useFileSections';

/**
 * Открытый раздел файлов: номер из адреса (`/admin/files/2`, у раздела
 * свойства — `/admin/files/property-6`), сам раздел, путь до него от корня —
 * для крошек, — куда класть файлы и Api его файлов для редактора.
 *
 * Разделы — список редактора контента, и лежат они в его ячейке: тот же
 * список, что на корне «Файлов». Сюда можно прийти и по прямой ссылке, минуя
 * корень, поэтому список перечитывается при показе.
 */
export function useFileSection() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { sections, isLoaded, error } = useFileSections();

  const id = typeof router.query.sectionId === 'string' ? router.query.sectionId : null;
  const path = useMemo(() => (id === null ? [] : sectionPath(sections, id)), [sections, id]);

  const last = path.length > 0 ? path[path.length - 1] : null;
  // Группа разделов свойств — не раздел: файлов в ней нет, загружать некуда
  const section = last !== null && !last.isGroup ? last : null;
  const target = section === null ? null : sectionTarget(section);
  const listKey = target === null ? null : targetListKey(target);

  // Api собирается раз на раздел: редактор следит за ключом списка, а не за объектом
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filesApi = useMemo(() => (target === null ? null : sectionFilesApi(target)), [listKey]);

  /**
   * Файлы загружены кнопкой над списком — мимо редактора, поэтому страницу
   * таблицы перечитываем сами: иначе новых файлов в ней не будет до возврата
   * в раздел.
   */
  const refreshFiles = useCallback(() => {
    if (listKey !== null) dispatch(reloadEditorPageThunk(listKey));
  }, [dispatch, listKey]);

  return {
    section,
    /** Разделы от корня до открытого включительно */
    path,
    /** Куда загружать файлы: в раздел или к свойству; null — раздела нет */
    target,
    /** Список файлов раздела: `files.2` или `property-files.6` */
    listKey,
    filesApi,
    refreshFiles,
    isLoaded,
    error,
  };
}

/** Где лежат файлы раздела: раздел свойства — это свойство, обычный — сам раздел. */
const sectionTarget = (section: FileSectionDto): UploadTarget =>
  section.propertyId !== null ? { propertyId: section.propertyId } : { sectionId: Number(section.id) };

const targetListKey = (target: UploadTarget): string =>
  'propertyId' in target ? ListKey.propertyFiles(target.propertyId) : ListKey.files(target.sectionId);

/**
 * Раздел и его предки, от корня. Кольцо в родителях данные сломать
 * не должно: пройденные разделы помним.
 */
export function sectionPath(sections: FileSectionDto[], id: string): FileSectionDto[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const path: FileSectionDto[] = [];
  const seen = new Set<string>();

  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path;
}
