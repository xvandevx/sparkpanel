import { PropertyType } from '../../../../logic/listSettings';

/**
 * Свойство записей, каким его правят в шторке, и всё, что с ним делают
 * до отправки на сервер. Держим отдельно от экранов: тип нужен и списку,
 * и шторке, и полям параметров типа.
 */

/** Шаг порядка: между соседями всегда есть куда вписать новое свойство. */
export const POSITION_STEP = 10;

/**
 * Свойство в шторке: поля записи плюс её номер. Номера нет — свойство ещё
 * не заведено, и уйдёт оно в `POST`, а не в `PATCH`.
 */
export interface PropertyDraft {
  /** Номер свойства; null — его ещё не заводили */
  id: number | null;
  position: number;
  code: string;
  name: string;
  type: string;
  /** Подсказка под полем в карточке записи; пусто — без подсказки */
  hint?: string;
  /** Код вкладки карточки; пусто — общая вкладка «Свойства» */
  tab?: string;
  required?: boolean;
  multiple?: boolean;
  /** Значение своё на домен: общее плюс свои у отдельных доменов и поддоменов */
  isMultiDomain?: boolean;
  /** Значение не отдаётся через API: его пишут, но ни карточка, ни сайт его не читают */
  isHidden?: boolean;
  /** Заполняется из внешнего источника: в карточке поле закрыто, пишет его внешняя система через API или MCP */
  isExternal?: boolean;
  /** Варианты «Списка»; номера нет у варианта, который ещё не сохраняли */
  options?: { id?: number; code: string; name: string }[];
  /**
   * Системное свойство: его заводит сервер, и ни поменять, ни удалить его
   * нельзя — шторка показывает его на просмотр, в таблице вместо корзины замок
   */
  isBlocked?: boolean;
  /**
   * Свойство заполнено хотя бы у одной записи (считает сервер): тип тогда
   * меняется только между строкой, текстом и HTML
   */
  isFilled?: boolean;
  /** Параметры типа: форматы, вес, разрешение, столбцы, источник привязки */
  [key: string]: unknown;
}

/** Новое свойство: обязательность, множественность и варианты сервер ждёт всегда. */
export const newProperty = (tab: string, position: number): PropertyDraft => ({
  id: null,
  position,
  code: '',
  name: '',
  hint: '',
  type: PropertyType.String,
  tab,
  required: false,
  multiple: false,
  options: [],
});

/**
 * Что уходит на сервер: номер там в адресе, а не в теле. Системность
 * и заполненность тоже не отправляем — их знает сервер, а не шторка.
 *
 * Мультидоменность, скрытость и внешний источник уходят всегда, даже выключенными: шторка держит
 * их в черновике, только пока они включены, а без `false` в теле сервер оставил
 * бы флаг как был.
 */
export const payloadOf = ({
  id: _id,
  isBlocked: _isBlocked,
  isFilled: _isFilled,
  ...property
}: PropertyDraft) => ({
  ...property,
  isMultiDomain: property.isMultiDomain === true,
  isHidden: property.isHidden === true,
  isExternal: property.isExternal === true,
  name: String(property.name).trim(),
  code: String(property.code).trim(),
  hint: String(property.hint ?? '').trim(),
});

/** Новому свойству — порядок за самым дальним на его вкладке. */
export const nextPosition = (properties: PropertyDraft[], tab: string): number =>
  properties
    .filter((property) => String(property.tab ?? '') === tab)
    .reduce((max, property) => Math.max(max, property.position ?? 0), 0) + POSITION_STEP;
