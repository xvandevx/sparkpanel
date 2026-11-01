import type { ContentBlockDto, ContentBlockUsageDto } from '../../src/api/client';
import { ContentBlockUsageDtoPlaceEnum } from '../../src/api/client';
import type { EditorHtmlBlock, EditorLink } from '../editorForm';
import { elementRecordId } from '../infoblocks/infoblockIds';
import { blockPath } from '../infoblocks/infoblockRoutes';

/**
 * Связи HTML-блока с остальной админкой: блоки для выбора в поле разметки
 * и ссылки на места, где блок подключён. Чистые функции — ни React, ни сети.
 */

export const CONTENT_ROOT = '/admin/content';

/** Страницы сайта: открытая запись — в `?id=`, как и везде в редакторе. */
const PAGES_ROOT = '/admin/pages';

/** Где открыть блок в админке. */
export const contentBlockHref = (id: number): string => `${CONTENT_ROOT}?id=${id}`;

/** Блоки в том виде, в каком их подключает поле разметки любого раздела. */
export const toHtmlBlockOptions = (items: ContentBlockDto[]): EditorHtmlBlock[] =>
  items.map((item) => ({
    code: item.code,
    name: item.name,
    isActive: item.isActive,
    href: contentBlockHref(item.id),
  }));

/** Подписи полей записи инфоблока, в которых стоит маркер. */
const ELEMENT_FIELD_LABELS: Record<string, string> = {
  preview: 'в анонсе',
  content: 'в тексте',
};

/** Место подключения → ссылка в шторке блока. */
function usageLink(usage: ContentBlockUsageDto): EditorLink {
  if (usage.place === ContentBlockUsageDtoPlaceEnum.Page) {
    return {
      key: `page-${usage.id}`,
      label: `Страница «${usage.name}»`,
      href: `${PAGES_ROOT}?id=${usage.id}`,
    };
  }

  const fields = usage.fields.map((field) => ELEMENT_FIELD_LABELS[field] ?? field).join(', ');
  // Без типа и инфоблока адрес записи не собрать — тогда ведём в корень раздела
  const listPath =
    usage.sectionId !== null && usage.infoblockId !== null
      ? blockPath(usage.sectionId, usage.infoblockId)
      : '/admin/infoblocks';

  return {
    key: `element-${usage.id}`,
    label: `Запись «${usage.name}»`,
    href: `${listPath}?id=${elementRecordId(usage.id)}`,
    note: [usage.infoblockName, fields].filter(Boolean).join(' · '),
  };
}

export const toUsageLinks = (usages: ContentBlockUsageDto[]): EditorLink[] =>
  usages.map(usageLink);
