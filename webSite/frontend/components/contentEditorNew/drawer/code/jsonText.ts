/**
 * Текст поля «JSON»: проверка и раскладка по строкам. Сервер делает то же
 * при сохранении (`toJsonText` у свойства) — здесь это нужно, чтобы ошибку
 * увидели до «Сохранить», и для кнопки «Отформатировать».
 */

/** Почему текст — не JSON: с номером строки. Пусто или JSON — null. */
export const jsonError = (text: string): string | null => {
  if (text.trim() === '') return null;
  try {
    JSON.parse(text);
    return null;
  } catch (error) {
    // Позицию ошибки движок называет по-разному, но число после `position` есть всегда
    const position = /position (\d+)/.exec(String((error as Error).message))?.[1];
    const line = position === undefined ? null : text.slice(0, Number(position)).split('\n').length;
    return `${line === null ? '' : `Строка ${line}: `}это не JSON — проверьте скобки, кавычки и запятые`;
  }
};

/** JSON — по строкам с отступом в 2 пробела, как его хранит сервер. Не JSON — null. */
export const formatJson = (text: string): string | null => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
};
