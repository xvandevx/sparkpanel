/**
 * Человекочитаемый текст ошибки из ответа NestJS: `message` приходит строкой
 * (обычные исключения) или массивом (ошибки валидации DTO).
 */
export const apiErrorMessage = (error: any, fallback: string): string => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};
