import {
  ContentEditor,
  FieldType,
  standardFields,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { productsApi } from '../../logic/products';
import { ListKey } from '../../logic/listSettings';

/**
 * «Товары» — список товаров на редакторе контента. Своего экрана раздел
 * не пишет: называет код списка, отдаёт Api и описывает поля.
 *
 * Категорий среди полей нет: их назначают системным свойством «Категории» —
 * сервер заводит его сам, и карточка ставит его рядом с полями раздела.
 * Цену, описание, фото заводят свойствами в «Настройках списка».
 */
const PRODUCT_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенный товар остаётся в списке, но на сайт не попадает',
  },
  sort: standardFields.sort,
};

const PRODUCT_VIEW: EditorSettings = { addLabel: 'Добавить товар', isBackupShown: true };

export default function ProductsScreen() {
  return (
    <ContentEditor
      listKey={ListKey.products}
      api={productsApi}
      // Список плоский: группируют товары категориями, вложенности негде храниться
      blockedSettings={{ maxDepth: 1 }}
      settings={PRODUCT_VIEW}
      fields={PRODUCT_FIELDS}
    />
  );
}
