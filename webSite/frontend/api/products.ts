import { api, CreateProductDto, ProductDto, UpdateProductDto } from '../src/api/client';

/**
 * Сетевой слой товаров (`/api/infoblocks/products` — список редактора
 * контента). Единственное место, где дергается сгенерированный клиент.
 */

export const fetchProducts = async (): Promise<ProductDto[]> => {
  const { data } = await api.products.productsControllerFindAll();
  return data;
};

export const createProduct = async (dto: CreateProductDto): Promise<ProductDto> => {
  const { data } = await api.products.productsControllerCreate(dto);
  return data;
};

export const updateProduct = async (id: number, dto: UpdateProductDto): Promise<ProductDto> => {
  const { data } = await api.products.productsControllerUpdate(id, dto);
  return data;
};

/** Удаляет товар; значения его свойств, в том числе категории, сервер стирает сам. */
export const removeProduct = async (id: number): Promise<void> => {
  await api.products.productsControllerRemove(id);
};
