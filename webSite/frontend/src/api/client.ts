import {
  AuthApi,
  Configuration,
  ContentItemsApi,
  ContentsApi,
  ExternalApiApi,
  FileSectionsApi,
  FormFieldsApi,
  FormsApi,
  HistoryApi,
  InfoblockBackupsApi,
  InfoblockColumnsApi,
  InfoblockDomainsApi,
  InfoblockDraftsApi,
  InfoblockFilesApi,
  InfoblockFiltersApi,
  InfoblockPropertiesApi,
  InfoblockRecordsApi,
  InfoblockRolesApi,
  InfoblockSettingsApi,
  InfoblockStoragesApi,
  InfoblockTabsApi,
  InfoblockValuesApi,
  McpApi,
  PagesApi,
  ProductCategoriesApi,
  ProductsApi,
  SettingsApi,
  SiteBackupsApi,
  UsersApi,
} from '../generated/api';
import { API_HOST } from '../../config/api';
import { getAuthToken } from './auth-utils';

// basePath = "" => относительные пути (/api/...), т.е. тот же origin, что и фронт.
// Так и задумано: nginx отдаёт фронт и API на http://localhost:3400.
const configuration = new Configuration({
  basePath: API_HOST,
  accessToken: () => getAuthToken() ?? '',
});

export const authApi = new AuthApi(configuration);
export const contentItemsApi = new ContentItemsApi(configuration);
export const contentsApi = new ContentsApi(configuration);
export const externalApiApi = new ExternalApiApi(configuration);
export const fileSectionsApi = new FileSectionsApi(configuration);
export const formFieldsApi = new FormFieldsApi(configuration);
export const formsApi = new FormsApi(configuration);
export const infoblockBackupsApi = new InfoblockBackupsApi(configuration);
export const infoblockColumnsApi = new InfoblockColumnsApi(configuration);
export const infoblockDomainsApi = new InfoblockDomainsApi(configuration);
export const infoblockDraftsApi = new InfoblockDraftsApi(configuration);
export const infoblockFilesApi = new InfoblockFilesApi(configuration);
export const infoblockFiltersApi = new InfoblockFiltersApi(configuration);
export const historyApi = new HistoryApi(configuration);
export const infoblockPropertiesApi = new InfoblockPropertiesApi(configuration);
export const infoblockRecordsApi = new InfoblockRecordsApi(configuration);
export const infoblockRolesApi = new InfoblockRolesApi(configuration);
export const infoblockSettingsApi = new InfoblockSettingsApi(configuration);
export const infoblockStoragesApi = new InfoblockStoragesApi(configuration);
export const infoblockTabsApi = new InfoblockTabsApi(configuration);
export const infoblockValuesApi = new InfoblockValuesApi(configuration);
export const mcpApi = new McpApi(configuration);
export const pagesApi = new PagesApi(configuration);
export const productCategoriesApi = new ProductCategoriesApi(configuration);
export const productsApi = new ProductsApi(configuration);
export const settingsApi = new SettingsApi(configuration);
export const siteBackupsApi = new SiteBackupsApi(configuration);
export const usersApi = new UsersApi(configuration);

/** Все клиенты одним объектом — по одному полю на контроллер бэкенда. */
export const api = {
  auth: authApi,
  contentItems: contentItemsApi,
  contents: contentsApi,
  externalApi: externalApiApi,
  fileSections: fileSectionsApi,
  formFields: formFieldsApi,
  forms: formsApi,
  infoblockBackups: infoblockBackupsApi,
  infoblockColumns: infoblockColumnsApi,
  infoblockDomains: infoblockDomainsApi,
  infoblockDrafts: infoblockDraftsApi,
  infoblockFiles: infoblockFilesApi,
  infoblockFilters: infoblockFiltersApi,
  history: historyApi,
  infoblockProperties: infoblockPropertiesApi,
  infoblockRecords: infoblockRecordsApi,
  infoblockRoles: infoblockRolesApi,
  infoblockSettings: infoblockSettingsApi,
  infoblockStorages: infoblockStoragesApi,
  infoblockTabs: infoblockTabsApi,
  infoblockValues: infoblockValuesApi,
  mcp: mcpApi,
  pages: pagesApi,
  productCategories: productCategoriesApi,
  products: productsApi,
  settings: settingsApi,
  siteBackups: siteBackupsApi,
  users: usersApi,
};

export * from '../generated/api';
