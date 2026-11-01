import {
  createProductCategory,
  fetchProductCategories,
  removeProductCategory,
  updateProductCategory,
} from '../../api/productCategories';
import type { CreateProductCategoryDto, UpdateProductCategoryDto } from '../../src/api/client';

/**
 * Где лежат категории товаров. Категорию с товарами сервер не удалит —
 * она приходит с `isBlocked`, и редактор вместо корзины покажет замок.
 *
 * `parentId` переписываем, только если карточка его присылала: `null` в теле —
 * осознанный перенос в корень, а отсутствие ключа — «поле не трогали».
 */
const toCategoryPayload = (payload: Record<string, unknown>) => ({
  ...payload,
  ...(payload.parentId === undefined ? {} : { parentId: toCategoryId(payload.parentId) }),
});

/** Ключ записи у редактора строковый; в базе категория адресуется числом. */
const toCategoryId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const categoriesApi = {
  list: fetchProductCategories,
  create: (payload: Record<string, unknown>) =>
    createProductCategory(toCategoryPayload(payload) as unknown as CreateProductCategoryDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateProductCategory(Number(id), toCategoryPayload(payload) as UpdateProductCategoryDto),
  remove: (id: string) => removeProductCategory(Number(id)),
};
