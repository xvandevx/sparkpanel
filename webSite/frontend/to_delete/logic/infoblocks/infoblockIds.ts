import type { InfoblockDto, InfoblockElementDto, InfoblockSectionDto } from '../../src/api/client';

/**
 * Ключи записей раздела «Инфоблоки» и поиск по загруженной структуре.
 *
 * Уровней три — тип, инфоблок, запись, — и у каждого свой экран со своей
 * таблицей. Ключ строки берётся с приставкой (`section-1`, `block-2`,
 * `element-3`), потому что ровно такие ключи пишет журнал изменений на
 * бэкенде: совпадение даёт истории записи и ссылкам журнала работать без
 * перевода туда-обратно. Номера трёх таблиц начинаются с единицы, и без
 * приставки в общем журнале они перепутались бы.
 */

export const sectionRecordId = (id: number): string => `section-${id}`;
export const blockRecordId = (id: number): string => `block-${id}`;
export const elementRecordId = (id: number): string => `element-${id}`;

const parseWithPrefix = (prefix: string, value: unknown): number | null => {
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(String(value ?? ''));
  return match ? Number(match[1]) : null;
};

export const parseSectionRecordId = (value: unknown): number | null =>
  parseWithPrefix('section', value);
export const parseBlockRecordId = (value: unknown): number | null =>
  parseWithPrefix('block', value);
export const parseElementRecordId = (value: unknown): number | null =>
  parseWithPrefix('element', value);

/** Номер из адреса страницы: строка → число, мусор → null. */
export function toNumericId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ─── Поиск по структуре ───────────────────────────────────────────────────────

export const findSection = (
  sections: InfoblockSectionDto[],
  id: number | null,
): InfoblockSectionDto | null => sections.find((section) => section.id === id) ?? null;

/** Инфоблоки типа; типа нет — пустой список, а не исключение. */
export const blocksOfSection = (
  sections: InfoblockSectionDto[],
  sectionId: number | null,
): InfoblockDto[] => findSection(sections, sectionId)?.blocks ?? [];

export const findBlock = (
  sections: InfoblockSectionDto[],
  id: number | null,
): InfoblockDto | null =>
  sections.flatMap((section) => section.blocks ?? []).find((block) => block.id === id) ?? null;

// ─── Порядок ──────────────────────────────────────────────────────────────────

/** Шаг сортировки — тот же, что на бэкенде: между соседями остаётся место. */
const POSITION_STEP = 100;

const nextAfter = (positions: number[]): number =>
  (positions.length ? Math.max(...positions) : 0) + POSITION_STEP;

export const nextSectionPosition = (sections: InfoblockSectionDto[]): number =>
  nextAfter(sections.map((section) => section.position));

export const nextBlockPosition = (
  sections: InfoblockSectionDto[],
  sectionId: number | null,
): number => nextAfter(blocksOfSection(sections, sectionId).map((block) => block.position));

export const nextElementPosition = (elements: InfoblockElementDto[]): number =>
  nextAfter(elements.map((element) => element.position));

// ─── Общее для форм ───────────────────────────────────────────────────────────

/** Код: строчные латинские буквы, цифры и дефисы между ними. Совпадает с бэкендом. */
export const INFOBLOCK_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CODE_MESSAGE =
  'Код: строчные латинские буквы, цифры и дефис между ними — например, news';

/** Идентификатор в форме новой записи: настоящий выдаст бэкенд при сохранении. */
export const NEW_RECORD_ID = 'будет присвоен при сохранении';

/** Как зовётся одна запись списка, пока инфоблок не назвал её по-своему. */
export const DEFAULT_ELEMENT_NAME = 'Элемент';

export const text = (value: unknown): string => String(value ?? '').trim();

/** Проверка кода для поля формы: текст ошибки или null. */
export const validateCode = (value: unknown): string | null => {
  const code = text(value);
  // Пустоту ловит `required` — сообщение там понятнее
  if (!code) return null;
  return INFOBLOCK_CODE_PATTERN.test(code) ? null : CODE_MESSAGE;
};

/** Пустое значение поля-числа приводим к нулю: бэкенд ждёт целое. */
export const toPosition = (value: unknown): number => Number(value) || 0;
