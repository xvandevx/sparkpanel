import Link from 'next/link';
import { Alert, Breadcrumb, Result, Spin } from 'antd';
import {
  ContentEditor,
  FieldType,
  standardFields,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { useContent } from '../../logic/contents';
import { ListKey } from '../../logic/listSettings';
import { PageTitle } from '../ui';

/**
 * Один тип контента: крошки до него и его элементы на редакторе контента.
 * Элемент — запись списка `content-items.<номер типа>`: у элементов каждого
 * типа свои свойства (текст, дата, картинка), их заводят в «Настройках списка».
 * Имя и код этого списка — название и код типа: в настройках они закрыты.
 */
const ITEM_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенный элемент остаётся в списке, но на сайт не попадает',
  },
  sort: standardFields.sort,
};

/** Заголовок списка не нужен: тип назван сам, над списком. */
const ITEM_VIEW: EditorSettings = {
  addLabel: 'Добавить элемент',
  isTitleHidden: true,
  isBackupShown: true,
};

export default function ContentItemsScreen() {
  const { contentId, content, path, itemsApi, isLoaded, error } = useContent();

  if (error && !isLoaded) return <Alert type="error" showIcon message={error} />;
  if (!isLoaded) return <Spin />;
  if (!content || contentId === null || itemsApi === null) {
    return (
      <Result
        status="404"
        title="Тип контента не найден"
        extra={<Link href="/admin/contents">К типам контента</Link>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { title: <Link href="/admin/contents">Типы контента</Link> },
          ...path.map((item) => ({
            title:
              item.id === content.id ? (
                item.name
              ) : (
                <Link href={`/admin/contents/${item.id}`}>{item.name}</Link>
              ),
          })),
        ]}
      />
      <PageTitle>{content.name}</PageTitle>

      <ContentEditor
        listKey={ListKey.contentItems(contentId)}
        api={itemsApi}
        settings={ITEM_VIEW}
        fields={ITEM_FIELDS}
      />
    </div>
  );
}
