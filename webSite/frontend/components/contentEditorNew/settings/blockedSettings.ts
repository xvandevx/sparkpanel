import { codeModeFlags, isTreeDepth, type CodeModeValue } from '../../../logic/listSettings';
import type { EditorListSettings } from '../../../redux/reducers/contentEditorNewReducer';

/**
 * Настройки списка, которые задаёт сам раздел. В окне настроек они видны
 * и показывают своё значение, но закрыты: «Страницы» — всегда дерево,
 * у «Файлов» нет журнала изменений.
 * Разреши их править — раздел перестанет быть собой.
 *
 * Закрытая настройка не просто серая: её значение сильнее сохранённого.
 * Поэтому окно показывает именно его и его же отправляет — список, у которого
 * в базе лежит что-то другое, чинится первым же сохранением.
 */
export interface BlockedSettings {
  /**
   * Уровней вложенности — он же решает, дерево ли список: 1 — плоский,
   * `null` — дерево без ограничения («Страницы»)
   */
  maxDepth?: number | null;
  /** Символьный код записей */
  codeMode?: CodeModeValue;
  /**
   * История изменений: `false` у списков без журнала — их правки сервер
   * не пишет никуда (файлы, хранилища, домены)
   */
  isHistoryEnabled?: boolean;
  /**
   * Черновики: `false` у списков, где их не бывает, — учётные записи и роли
   * (управление панелью, а не контент сайта) и файлы (их заменяют загрузкой)
   */
  isDraftEnabled?: boolean;
}

/** Настройки списка глазами редактора: сохранённые, поверх — закрытые разделом. */
export const effectiveSettings = (
  settings: EditorListSettings | null,
  blocked: BlockedSettings = {},
): EditorListSettings | null =>
  settings === null
    ? null
    : {
        ...settings,
        ...(blocked.maxDepth === undefined ? {} : { maxDepth: blocked.maxDepth }),
        ...(blocked.codeMode === undefined ? {} : codeModeFlags(blocked.codeMode)),
        ...(blocked.isHistoryEnabled === undefined
          ? {}
          : { isHistoryEnabled: blocked.isHistoryEnabled }),
        ...(blocked.isDraftEnabled === undefined ? {} : { isDraftEnabled: blocked.isDraftEnabled }),
      };

/**
 * Правила записей глазами карточки: что закрыл раздел — известно сразу,
 * остальное приходит с настройками списка.
 *
 * Отдельно от `effectiveSettings`, потому что до ответа сервера настроек нет
 * вовсе, а карточку уже могли открыть: не будь этого, «Страницы» на мгновение
 * показывали бы запись без родителя — и сохранение унесло бы её в корень.
 */
export const recordRules = (
  settings: EditorListSettings | null,
  blocked: BlockedSettings = {},
): {
  isTree: boolean;
  useCode: boolean;
  codeRequired: boolean;
  codeUnique: boolean;
  /** Уровней вложенности; null — дерево без ограничения */
  maxDepth: number | null;
} => {
  const closed = blocked.codeMode === undefined ? null : codeModeFlags(blocked.codeMode);
  // Пока настройки не пришли, список считаем плоским — если раздел не закрыл предел сам.
  // Не `?? 1`: пришедший `null` — это дерево без предела, а не «настроек нет»
  const maxDepth =
    blocked.maxDepth !== undefined ? blocked.maxDepth : settings === null ? 1 : settings.maxDepth;
  return {
    isTree: isTreeDepth(maxDepth),
    maxDepth,
    // Код у записей есть, пока его не выключили настройками списка
    useCode: closed?.useCode ?? settings?.useCode !== false,
    codeRequired: closed?.codeRequired ?? settings?.codeRequired === true,
    codeUnique: closed?.codeUnique ?? settings?.codeUnique === true,
  };
};
