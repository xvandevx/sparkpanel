import { ELEMENT_HISTORY_LABELS } from './elementFields';

/**
 * Подписи полей в истории изменений: ключи те же, что в снимке на бэкенде.
 *
 * Набор общий на все три уровня: журнал у раздела один, и на любом из трёх
 * экранов в нём рядом лежат правки типов, инфоблоков и записей. Своей карты
 * подписей каждому не досталось бы, а поле без подписи показывалось бы
 * сырым ключом.
 */
export const INFOBLOCKS_HISTORY_LABELS: Record<string, string> = {
  code: 'Код',
  name: 'Название',
  description: 'Пояснение',
  position: 'Порядок',
  sectionId: 'Тип',
  elementName: 'Название одной записи',
  isActive: 'Активен',
  ...ELEMENT_HISTORY_LABELS,
};
