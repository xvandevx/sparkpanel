import { createProduct, fetchProducts, removeProduct, updateProduct } from '../../api/products';
import type { CreateProductDto, UpdateProductDto } from '../../src/api/client';

/**
 * Где лежат товары. Категории сюда не входят: это системное свойство
 * «Категории», его значения редактор сохраняет сам вторым запросом.
 *
 * Ключ записи у редактора строковый; в базе товар адресуется числом.
 */
export const productsApi = {
  list: fetchProducts,
  create: (payload: Record<string, unknown>) => createProduct(payload as unknown as CreateProductDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateProduct(Number(id), payload as UpdateProductDto),
  remove: (id: string) => removeProduct(Number(id)),
};
