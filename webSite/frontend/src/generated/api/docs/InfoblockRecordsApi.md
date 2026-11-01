# InfoblockRecordsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**recordsControllerPage**](#recordscontrollerpage) | **GET** /api/infoblocks/records/{listKey} | Страница записей списка: поиск, фильтр, сортировка|

# **recordsControllerPage**
> RecordsPageDto recordsControllerPage()


### Example

```typescript
import {
    InfoblockRecordsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockRecordsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let page: number; //Номер страницы, с 1 (optional) (default to undefined)
let pageSize: 20 | 50 | 100; //Записей на странице; у дерева — записей верхнего уровня (optional) (default to undefined)
let search: string; //Строка поиска: номер записи целиком, поля — подстрокой (optional) (default to undefined)
let searchIn: string; //Поля записи, по которым ищет строка поиска, через запятую (optional) (default to undefined)
let sort: string; //Поле сортировки; нет — по ID, новые сверху (optional) (default to undefined)
let order: 'asc' | 'desc'; //Без поля сортировки по умолчанию desc (optional) (default to undefined)
let isTree: boolean; //Таблица — дерево: страница — записи верхнего уровня со всеми ветками (optional) (default to undefined)
let isDraft: boolean; //Только записи с черновиком — вид «Черновики»; плоским списком и у дерева (optional) (default to undefined)
let filters: string; //Поля фильтра JSON-массивом: { key, kind: options|text|range|filled, … } (optional) (default to undefined)

const { status, data } = await apiInstance.recordsControllerPage(
    listKey,
    page,
    pageSize,
    search,
    searchIn,
    sort,
    order,
    isTree,
    isDraft,
    filters
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **page** | [**number**] | Номер страницы, с 1 | (optional) defaults to undefined|
| **pageSize** | [**20 | 50 | 100**]**Array<20 &#124; 50 &#124; 100>** | Записей на странице; у дерева — записей верхнего уровня | (optional) defaults to undefined|
| **search** | [**string**] | Строка поиска: номер записи целиком, поля — подстрокой | (optional) defaults to undefined|
| **searchIn** | [**string**] | Поля записи, по которым ищет строка поиска, через запятую | (optional) defaults to undefined|
| **sort** | [**string**] | Поле сортировки; нет — по ID, новые сверху | (optional) defaults to undefined|
| **order** | [**&#39;asc&#39; | &#39;desc&#39;**]**Array<&#39;asc&#39; &#124; &#39;desc&#39;>** | Без поля сортировки по умолчанию desc | (optional) defaults to undefined|
| **isTree** | [**boolean**] | Таблица — дерево: страница — записи верхнего уровня со всеми ветками | (optional) defaults to undefined|
| **isDraft** | [**boolean**] | Только записи с черновиком — вид «Черновики»; плоским списком и у дерева | (optional) defaults to undefined|
| **filters** | [**string**] | Поля фильтра JSON-массивом: { key, kind: options|text|range|filled, … } | (optional) defaults to undefined|


### Return type

**RecordsPageDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список или непонятный фильтр |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

