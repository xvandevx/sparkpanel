import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux';
import { recordRules, type BlockedSettings } from '../settings';
import type { EditorColumns } from './ContentEditorTable';

/**
 * Строка поиска над таблицей: по чему она ищет. Ищет сервер — поля уходят
 * в запрос страницы (`searchIn`), номер записи он сверяет всегда, целиком.
 *
 * Ищет всегда по номеру записи (ID) и по её символьному коду — они есть
 * у записи любого списка, раздел их не перечисляет. Код — пока его не выключили
 * в настройках списка. Сверх этого — колонки раздела с `isSearch` (название,
 * адрес, email): по тексту ячейки, что видно — то и находится.
 */

/** Поле, по которому ищут: колонка раздела, номер записи или код. */
interface SearchField {
  key: string;
  /** Подпись в подсказке строки поиска */
  name: string;
}

/** Номер записи ищется целиком: по «12» находится запись 12, а не 112 и 120. */
const ID_KEY = 'id';
const CODE_KEY = 'code';

/** Поля поиска списка: колонки с `isSearch`, за ними ID и код. */
export function useSearchFields(
  listKey: string,
  columns: EditorColumns,
  blockedSettings?: BlockedSettings,
): SearchField[] {
  const settings = useSelector(
    (state: RootState) => state.contentEditorNew[listKey]?.settings ?? null,
  );
  const { useCode } = recordRules(settings, blockedSettings);

  const fromColumns = Object.keys(columns)
    .filter((key) => columns[key].isSearch)
    .map((key) => ({ key, name: columns[key].name.toLowerCase() }));
  const isCodeColumn = fromColumns.some((field) => field.key === CODE_KEY);

  return [
    ...fromColumns,
    { key: ID_KEY, name: 'ID' },
    ...(useCode && !isCodeColumn ? [{ key: CODE_KEY, name: 'код' }] : []),
  ];
}

/** Подсказка в строке поиска: «Поиск: название, ID, код». */
export const searchPlaceholder = (fields: SearchField[]): string =>
  `Поиск: ${fields.map((field) => field.name).join(', ')}`;
