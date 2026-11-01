import {
  api,
  CreateProductCategoryDto,
  ProductCategoryDto,
  UpdateProductCategoryDto,
} from '../src/api/client';

/**
 * Сетевой слой категорий товаров (`/api/infoblocks/products/categories` —
 * дерево редактора контента). Единственное место, где дергается
 * сгенерированный клиент.
 */

/** Плоский список: дерево собирает редактор по parentId. */
export const fetchProductCategories = async (): Promise<ProductCategoryDto[]> => {
  const { data } = await api.productCategories.productCategoriesControllerFindAll();
  return data;
};

export const createProductCategory = async (
  dto: CreateProductCategoryDto,
): Promise<ProductCategoryDto> => {
  const { data } = await api.productCategories.productCategoriesControllerCreate(dto);
  return data;
};

export const updateProductCategory = async (
  id: number,
  dto: UpdateProductCategoryDto,
): Promise<ProductCategoryDto> => {
  const { data } = await api.productCategories.productCategoriesControllerUpdate(id, dto);
  return data;
};

/** Удаляет пустую категорию: с товарами или вложенными сервер не отдаст (409). */
export const removeProductCategory = async (id: number): Promise<void> => {
  await api.productCategories.productCategoriesControllerRemove(id);
};
