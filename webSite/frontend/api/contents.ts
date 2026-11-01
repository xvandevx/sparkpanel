import { api, ContentDto, CreateContentDto, UpdateContentDto } from '../src/api/client';

/**
 * Сетевой слой раздела «Контент» — типов контента (`/api/infoblocks/contents`,
 * список редактора контента). Единственное место, где дергается сгенерированный клиент.
 */

export const fetchContents = async (): Promise<ContentDto[]> => {
  const { data } = await api.contents.contentsControllerFindAll();
  return data;
};

export const createContent = async (dto: CreateContentDto): Promise<ContentDto> => {
  const { data } = await api.contents.contentsControllerCreate(dto);
  return data;
};

export const updateContent = async (id: number, dto: UpdateContentDto): Promise<ContentDto> => {
  const { data } = await api.contents.contentsControllerUpdate(id, dto);
  return data;
};

/** Удаляет пустой тип; тип с элементами или вложенными сервер не отдаст (409). */
export const removeContent = async (id: number): Promise<void> => {
  await api.contents.contentsControllerRemove(id);
};
