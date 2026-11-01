/**
 * Мультидоменность: значение свойства своё на домен и поддомен сайта.
 * Формат такого значения и домены для выбора в карточке записи.
 */
export { domainValuesOf, ownDomainCount, uncoveredDomainIds } from './domainValues';
export type { DomainValue } from './domainValues';
export { domainLabels, domainOptions, freeDomainOptions } from './domainOptions';
export type { DomainOption } from './domainOptions';
export { useDomainOptions } from './useDomainOptions';
