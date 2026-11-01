import {
  api,
  CreateInfoblockDto,
  CreateInfoblockElementDto,
  CreateInfoblockSectionDto,
  HistoryPageDto,
  HistoryRecordDto,
  InfoblockDto,
  InfoblockElementDto,
  InfoblockSectionDto,
  RemovedInfoblockDto,
  UpdateInfoblockDto,
  UpdateInfoblockElementDto,
  UpdateInfoblockSectionDto,
} from '../src/api/client';

/**
 * Сетевой слой раздела «Инфоблоки». Единственное место, где дергается
 * сгенерированный клиент; выше по стеку сюда ходят только thunks из redux/.
 */

/** Разделы вместе с их инфоблоками: вся структура левой панели одним запросом. */
export const fetchStructure = async (): Promise<InfoblockSectionDto[]> => {
  const { data } = await api.infoblocks.infoblocksControllerFindStructure();
  return data;
};

// ─── Разделы ──────────────────────────────────────────────────────────────────

export const createSection = async (
  dto: CreateInfoblockSectionDto,
): Promise<InfoblockSectionDto> => {
  const { data } = await api.infoblocks.infoblocksControllerCreateSection(dto);
  return data;
};

export const updateSection = async (
  id: number,
  dto: UpdateInfoblockSectionDto,
): Promise<InfoblockSectionDto> => {
  const { data } = await api.infoblocks.infoblocksControllerUpdateSection(id, dto);
  return data;
};

/** Удаляет раздел вместе с его инфоблоками и их элементами. */
export const removeSection = async (id: number): Promise<RemovedInfoblockDto> => {
  const { data } = await api.infoblocks.infoblocksControllerRemoveSection(id);
  return data;
};

// ─── Инфоблоки ────────────────────────────────────────────────────────────────

export const createBlock = async (dto: CreateInfoblockDto): Promise<InfoblockDto> => {
  const { data } = await api.infoblocks.infoblocksControllerCreateBlock(dto);
  return data;
};

export const updateBlock = async (
  id: number,
  dto: UpdateInfoblockDto,
): Promise<InfoblockDto> => {
  const { data } = await api.infoblocks.infoblocksControllerUpdateBlock(id, dto);
  return data;
};

/** Удаляет инфоблок вместе с его элементами. */
export const removeBlock = async (id: number): Promise<RemovedInfoblockDto> => {
  const { data } = await api.infoblocks.infoblocksControllerRemoveBlock(id);
  return data;
};

// ─── Элементы ─────────────────────────────────────────────────────────────────

export const fetchElements = async (blockId: number): Promise<InfoblockElementDto[]> => {
  const { data } = await api.infoblocks.infoblocksControllerFindElements(blockId);
  return data;
};

export const createElement = async (
  blockId: number,
  dto: CreateInfoblockElementDto,
): Promise<InfoblockElementDto> => {
  const { data } = await api.infoblocks.infoblocksControllerCreateElement(blockId, dto);
  return data;
};

export const updateElement = async (
  blockId: number,
  id: number,
  dto: UpdateInfoblockElementDto,
): Promise<InfoblockElementDto> => {
  const { data } = await api.infoblocks.infoblocksControllerUpdateElement(blockId, id, dto);
  return data;
};

export const removeElement = async (
  blockId: number,
  id: number,
): Promise<RemovedInfoblockDto> => {
  const { data } = await api.infoblocks.infoblocksControllerRemoveElement(blockId, id);
  return data;
};

// ─── Журнал ───────────────────────────────────────────────────────────────────

/** История одной записи; entityId — с приставкой: `section-1`, `block-2`, `element-3`. */
export const fetchRecordHistory = async (entityId: string): Promise<HistoryRecordDto[]> => {
  const { data } = await api.infoblocks.infoblocksControllerFindHistory(entityId);
  return data;
};

/** Общий журнал изменений раздела, страницами. */
export const fetchJournal = async (
  limit: number,
  offset: number,
): Promise<HistoryPageDto> => {
  const { data } = await api.infoblocks.infoblocksControllerFindJournal(limit, offset);
  return data;
};
