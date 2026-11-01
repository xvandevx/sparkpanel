import type { EditorHtmlBlock } from './types';
import { insertToken } from './variables';

/**
 * Подключение переиспользуемых HTML-блоков в разметку.
 *
 * Блок подключается маркером `#BLOCK:код#` — на его место сайт подставит
 * разметку блока. Решётки — тот же приём, что у переменных шаблонов (`#NAME#`),
 * но с переменной маркер не путается: у неё имя заглавными и без двоеточия.
 *
 * Синтаксис продублирован на бэкенде (`content/html-block-token.ts`): по нему
 * он ищет, где блок подключён, и не даёт удалить подключённый блок.
 */

/** Код блока — строчные латинские буквы, цифры и дефис, как и в его форме. */
export const HTML_BLOCK_PATTERN = /#BLOCK:([a-z0-9]+(?:-[a-z0-9]+)*)#/g;

/** Маркер, которым блок пишется в разметке. */
export const htmlBlockToken = (code: string): string => `#BLOCK:${code}#`;

/** Коды подключённых блоков без повторов и в порядке появления в разметке. */
export function extractHtmlBlockCodes(html: unknown): string[] {
  const codes: string[] = [];

  for (const match of Array.from(String(html ?? '').matchAll(HTML_BLOCK_PATTERN))) {
    if (!codes.includes(match[1])) codes.push(match[1]);
  }

  return codes;
}

/** Состояние подключённого блока: выводится, выключен или не существует вовсе. */
export const HtmlBlockStatus = {
  Active: 'active',
  /** Блок есть, но выключен: на сайте на его месте будет пусто */
  Inactive: 'inactive',
  /** Блока с таким кодом нет: удалили, переименовали или опечатка в маркере */
  Missing: 'missing',
} as const;

export type HtmlBlockStatus = (typeof HtmlBlockStatus)[keyof typeof HtmlBlockStatus];

export interface AttachedHtmlBlock {
  code: string;
  /** Сам блок; null — блока с таким кодом нет */
  block: EditorHtmlBlock | null;
  status: HtmlBlockStatus;
}

/** Какие блоки подключены в разметке и в каком они состоянии. */
export function attachedHtmlBlocks(html: unknown, blocks: EditorHtmlBlock[]): AttachedHtmlBlock[] {
  const byCode = new Map(blocks.map((block) => [block.code, block]));

  return extractHtmlBlockCodes(html).map((code) => {
    const block = byCode.get(code) ?? null;
    const status = !block
      ? HtmlBlockStatus.Missing
      : block.isActive
        ? HtmlBlockStatus.Active
        : HtmlBlockStatus.Inactive;
    return { code, block, status };
  });
}

/** Маркеры блоков, которых нет в списке: на сайте на их месте будет пусто. */
export const missingHtmlBlocks = (html: unknown, blocks: EditorHtmlBlock[]): string[] =>
  attachedHtmlBlocks(html, blocks)
    .filter((item) => item.status === HtmlBlockStatus.Missing)
    .map((item) => item.code);

/** Вставка маркера блока в позицию курсора — как и переменной шаблона. */
export const insertHtmlBlock = (html: unknown, cursor: number | null, code: string) =>
  insertToken(html, cursor, htmlBlockToken(code));
