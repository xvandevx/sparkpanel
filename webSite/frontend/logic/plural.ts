/**
 * Подпись количества с правильным окончанием: 1 файл, 2 файла, 5 файлов.
 * Общая на разделы — счётчики вложенного есть и у типов инфоблоков,
 * и у разделов медиатеки.
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} ${many}`;

  const mod10 = count % 10;
  if (mod10 === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}
