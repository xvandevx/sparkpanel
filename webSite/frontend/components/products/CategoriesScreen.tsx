import {
  ContentEditor,
  FieldType,
  standardFields,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { categoriesApi } from '../../logic/products';
import { ListKey } from '../../logic/listSettings';

/**
 * «Категории» — дерево категорий товаров на редакторе контента. Товару
 * категории назначают в его карточке, системным свойством «Категории»;
 * категорию с товарами сервер не удалит — она приходит с `isBlocked`,
 * и вместо корзины виден замок.
 *
 * Код и родителя раздел не описывает — их добавляет редактор по настройкам
 * списка. Глубина дерева и символьный код — обычные настройки: по умолчанию
 * дерево без предела и необязательный код.
 */
const CATEGORY_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенная категория на сайт не попадает',
  },
  sort: standardFields.sort,
};

const CATEGORY_VIEW: EditorSettings = { addLabel: 'Добавить категорию', isBackupShown: true };

export default function CategoriesScreen() {
  return (
    <ContentEditor
      listKey={ListKey.productCategories}
      api={categoriesApi}
      // По коду списка категорию находит системное свойство товаров
      settings={CATEGORY_VIEW}
      fields={CATEGORY_FIELDS}
    />
  );
}
