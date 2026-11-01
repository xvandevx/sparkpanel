import type { EditorVariable } from './types';

/**
 * Подстановка переменных в шаблонах.
 *
 * Переменная пишется решётками: `#NAME#`. Такой синтаксис не пересекается ни с
 * HTML, ни с обычным текстом меты — в отличие от `{{...}}`, которые в описаниях
 * встречаются сами по себе.
 *
 * Здесь только чистые функции: шаблон разбирается и подставляется одинаково и в
 * предпросмотре админки, и на стороне сайта.
 */

/** Имя переменной: заглавные латинские буквы, цифры и подчёркивания. */
export const VARIABLE_PATTERN = /#([A-Z][A-Z0-9_]*)#/g;

/** Обёртка имени в вид, в котором переменная пишется в шаблоне. */
export const variableToken = (name: string): string => `#${name}#`;

/** Имена переменных, использованных в шаблоне, без повторов и в порядке появления. */
export function extractVariables(template: unknown): string[] {
  const text = String(template ?? '');
  const names: string[] = [];

  for (const match of Array.from(text.matchAll(VARIABLE_PATTERN))) {
    const name = match[1];
    if (!names.includes(name)) names.push(name);
  }

  return names;
}

/**
 * Подстановка значений. Переменная, которой нет в `values`, остаётся в тексте
 * как есть: пустая строка вместо неё скрыла бы опечатку в имени.
 */
export function substituteVariables(
  template: unknown,
  values: Record<string, string | undefined>,
): string {
  return String(template ?? '').replace(VARIABLE_PATTERN, (token, name: string) => {
    const value = values[name];
    return value === undefined ? token : value;
  });
}

/** Предпросмотр шаблона на примерах значений — то, что видно под полем в админке. */
export function previewTemplate(template: unknown, variables: EditorVariable[]): string {
  const samples: Record<string, string> = {};
  for (const variable of variables) samples[variable.name] = variable.sample;
  return substituteVariables(template, samples);
}

/** Переменные шаблона, которых нет в списке допустимых: почти всегда это опечатка. */
export function unknownVariables(template: unknown, variables: EditorVariable[]): string[] {
  const allowed = new Set(variables.map((variable) => variable.name));
  return extractVariables(template).filter((name) => !allowed.has(name));
}

/**
 * Вставка готового маркера в текст по позиции курсора. Возвращает новый текст и
 * позицию курсора после вставки, чтобы поле не «прыгало» в конец после клика.
 * Общая для переменных шаблона и маркеров HTML-блоков (`htmlBlocks.ts`).
 */
export function insertToken(
  source: unknown,
  cursor: number | null,
  token: string,
): { text: string; cursor: number } {
  const text = String(source ?? '');
  const at = cursor === null || cursor < 0 || cursor > text.length ? text.length : cursor;

  return {
    text: `${text.slice(0, at)}${token}${text.slice(at)}`,
    cursor: at + token.length,
  };
}

/** Вставка переменной в текст по позиции курсора. */
export const insertVariable = (template: unknown, cursor: number | null, name: string) =>
  insertToken(template, cursor, variableToken(name));
