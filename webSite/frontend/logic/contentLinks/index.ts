/**
 * Привязки: значение свойства — запись другого списка (страница, элемент
 * контента, роль, форма) или тип контента. Ключ привязки, варианты выбора и записи, из которых выбирают.
 */
export { linkKeyOf, linkOf } from './linkKey';
export type { ContentLink } from './linkKey';
export { CONTENT_TYPES_LIST, linkListOf, linkOptions, linkPaths, linkTree, withId } from './linkOptions';
export type { LinkOption, LinkOptionGroup, LinkTreeNode } from './linkOptions';
export { linkSourceTree } from './linkSourceTree';
export type { LinkSourceNode } from './linkSourceTree';
export { useLinkTargets } from './useLinkTargets';
