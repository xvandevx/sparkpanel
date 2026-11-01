/**
 * Переходник к правилам Ant Design: форма ждёт промис, который реджектится текстом
 * ошибки. Сами правила остаются чистыми функциями в logic/<feature>/.
 */
export const asRule =
  <T = string>(check: (value: T) => string | null) =>
  (_rule: unknown, value: T): Promise<void> => {
    const message = check(value);
    return message ? Promise.reject(new Error(message)) : Promise.resolve();
  };
