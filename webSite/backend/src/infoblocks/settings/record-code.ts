import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * Символьный код записи по настройке списка «Символьный код записей». Одно
 * место на все разделы: каждый сервис списка читает свои настройки и говорит,
 * занят ли код, а что из этого следует — решается здесь.
 *
 * Модулем-сервисом это не сделать: модуль настроек сам импортирует модули
 * списков, и обратный импорт замкнул бы их в кольцо. Поэтому — как с пределом
 * вложенности (`tree-depth.ts`) — функция, а не сервис.
 */

/** Три флага настройки — те же, что в окне настроек одним выбором. */
export interface CodeSettings {
  useCode: boolean;
  codeRequired: boolean;
  codeUnique: boolean;
}

/**
 * Что не так с кодом записи; null — всё в порядке. Отдельно от `assertRecordCode`,
 * чтобы правила проверялись без базы.
 *
 * - Настроек нет — правил тоже: по умолчанию код необязательный.
 * - «Нет» (`useCode: false`) прячет поле, но кода у записи не отменяет и не проверяет.
 * - Уникальность — только вместе с обязательностью: так её и выбирают в окне
 *   («Обязательный и уникальный»), а пустой код сверять не с чем.
 * - Уровень записи в дереве не важен: обязательный код обязателен и у корневых.
 */
export function codeError(
  settings: CodeSettings | null,
  code: string,
  isTaken: boolean,
): { isConflict: boolean; message: string } | null {
  if (!settings || settings.useCode === false || !settings.codeRequired) return null;
  if (code.trim() === '') {
    return { isConflict: false, message: 'Заполните код: в этом списке он обязательный' };
  }
  if (settings.codeUnique && isTaken) {
    return { isConflict: true, message: 'Запись с таким кодом в списке уже есть' };
  }
  return null;
}

/**
 * Код записи по настройкам списка: пустой обязательный — 400, повтор
 * уникального — 409. `isTaken` — есть ли такой код у другой записи того же
 * списка; спрашивается, только если список требует уникальности.
 *
 * Проверяется итоговый код записи, а не присланное поле: правка одного названия
 * у записи без кода в списке, где код стал обязательным, тоже не пройдёт —
 * так же ведёт себя карточка в панели.
 */
export async function assertRecordCode(
  settings: CodeSettings | null,
  code: string,
  isTaken: (code: string) => Promise<boolean>,
): Promise<void> {
  const trimmed = code.trim();
  const isUniqueChecked =
    settings !== null && settings.useCode !== false && settings.codeRequired && settings.codeUnique;
  const error = codeError(
    settings,
    trimmed,
    isUniqueChecked && trimmed !== '' ? await isTaken(trimmed) : false,
  );
  if (!error) return;
  throw error.isConflict
    ? new ConflictException(error.message)
    : new BadRequestException(error.message);
}
