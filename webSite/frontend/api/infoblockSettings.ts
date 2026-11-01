import {
  api,
  CreateInfoblockTabDto,
  InfoblockColumnDto,
  InfoblockPropertyDto,
  UpdateInfoblockPropertyDto,
  InfoblockTabDto,
  LinkSourceDto,
  LinkTargetDto,
  OptionSourceDto,
  InfoblockSettingsDto,
  UpdateInfoblockSettingsDto,
} from '../src/api/client';

/**
 * Сетевой слой настроек списков: имя, код и свойства записей любого экрана
 * редактора контента. Единственное место, где дергается сгенерированный клиент;
 * выше по стеку сюда ходят только thunks из redux/.
 */

/** Настройки списка; если их не сохраняли — пустые (имя и код null, свойств нет). */
export const fetchListSettings = async (listKey: string): Promise<InfoblockSettingsDto> => {
  const { data } = await api.infoblockSettings.infoblockSettingsControllerFindOne(listKey);
  return data;
};

export const saveListSettings = async (
  listKey: string,
  dto: UpdateInfoblockSettingsDto,
): Promise<InfoblockSettingsDto> => {
  const { data } = await api.infoblockSettings.infoblockSettingsControllerSave(listKey, dto);
  return data;
};

/**
 * Записи для привязок — только из названных списков: все записи панели разом
 * повесили бы выбор, когда их станет много.
 */
export const fetchLinkTargets = async (listKeys: string[]): Promise<LinkTargetDto[]> => {
  const { data } = await api.infoblockSettings.infoblockSettingsControllerFindLinkTargets(
    listKeys.join(','),
  );
  return data;
};

/** Свойства-«Списки», на варианты которых может смотреть привязка к значениям списка. */
export const fetchOptionSources = async (): Promise<OptionSourceDto[]> => {
  const { data } = await api.infoblockSettings.infoblockSettingsControllerFindOptionSources();
  return data;
};

/** Списки-источники привязки: страницы, инфоблоки поимённо, блоки, формы. */
export const fetchLinkSources = async (): Promise<LinkSourceDto[]> => {
  const { data } = await api.infoblockSettings.infoblockSettingsControllerFindLinkSources();
  return data;
};

/**
 * Вкладки карточки записи. Своя сущность со своими маршрутами: вкладку
 * заводят и убирают по одной и сразу, без черновика настроек.
 */
export const fetchInfoblockTabs = async (listKey: string): Promise<InfoblockTabDto[]> => {
  const { data } = await api.infoblockTabs.infoblockTabsControllerFindAll(listKey);
  return data;
};

export const createInfoblockTab = async (
  listKey: string,
  name: string,
): Promise<InfoblockTabDto> => {
  const { data } = await api.infoblockTabs.infoblockTabsControllerCreate(listKey, {
    name,
  } as CreateInfoblockTabDto);
  return data;
};

export const renameInfoblockTab = async (
  listKey: string,
  id: number,
  name: string,
): Promise<InfoblockTabDto> => {
  const { data } = await api.infoblockTabs.infoblockTabsControllerRename(listKey, id, { name });
  return data;
};

/** Удаляет вкладку; её свойства переходят на общую вкладку «Свойства». */
export const removeInfoblockTab = async (listKey: string, id: number): Promise<void> => {
  await api.infoblockTabs.infoblockTabsControllerRemove(listKey, id);
};

/**
 * Свойства записей списка. Своя сущность со своими маршрутами, и правятся они
 * по одному: правка свойства не должна переписывать соседей.
 */
export const fetchInfoblockProperties = async (
  listKey: string,
): Promise<InfoblockPropertyDto[]> => {
  const { data } = await api.infoblockProperties.infoblockPropertiesControllerFindAll(listKey);
  return data;
};

export const createInfoblockProperty = async (
  listKey: string,
  property: InfoblockPropertyDto,
): Promise<InfoblockPropertyDto> => {
  const { data } = await api.infoblockProperties.infoblockPropertiesControllerCreate(
    listKey,
    property,
  );
  return data;
};

export const updateInfoblockProperty = async (
  listKey: string,
  id: number,
  property: UpdateInfoblockPropertyDto,
): Promise<InfoblockPropertyDto> => {
  const { data } = await api.infoblockProperties.infoblockPropertiesControllerUpdate(
    listKey,
    id,
    property,
  );
  return data;
};

/** Удаляет свойство вместе со значениями у всех записей списка. */
export const removeInfoblockProperty = async (listKey: string, id: number): Promise<void> => {
  await api.infoblockProperties.infoblockPropertiesControllerRemove(listKey, id);
};

/**
 * Колонки таблицы списка: видимые по порядку, с шириной. Вид таблицы у каждого
 * пользователя свой; пустой ответ — таблицу не настраивали.
 */
export const fetchListColumns = async (listKey: string): Promise<InfoblockColumnDto[]> => {
  const { data } = await api.infoblockColumns.infoblockColumnsControllerFindAll(listKey);
  return data;
};

/** Вид таблицы пишется целиком: порядок — свойство всего набора колонок. */
export const saveListColumns = async (
  listKey: string,
  columns: InfoblockColumnDto[],
): Promise<InfoblockColumnDto[]> => {
  const { data } = await api.infoblockColumns.infoblockColumnsControllerSave(listKey, { columns });
  return data;
};

/** Стирает сохранённый вид: таблица вернётся к колонкам раздела. */
export const resetListColumns = async (listKey: string): Promise<void> => {
  await api.infoblockColumns.infoblockColumnsControllerReset(listKey);
};

/**
 * Набор полей фильтра таблицы списка: ключи колонок по порядку. Один на список
 * для всех, кто его видит; пустой ответ — фильтра нет. Что в полях выбрано,
 * сервер не знает: это в адресе страницы.
 */
export const fetchListFilters = async (listKey: string): Promise<string[]> => {
  const { data } = await api.infoblockFilters.infoblockFiltersControllerFindAll(listKey);
  return data;
};

/** Набор полей пишется целиком, как и вид таблицы; пустой — фильтр убран. */
export const saveListFilters = async (listKey: string, keys: string[]): Promise<string[]> => {
  const { data } = await api.infoblockFilters.infoblockFiltersControllerSave(listKey, { keys });
  return data;
};
