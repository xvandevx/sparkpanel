# HistoryApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**historyControllerClearJournal**](#historycontrollerclearjournal) | **DELETE** /api/infoblocks/history/{listKey} | Очистить весь журнал изменений списка|
|[**historyControllerClearRecord**](#historycontrollerclearrecord) | **DELETE** /api/infoblocks/history/{listKey}/{recordId} | Очистить историю одной записи списка|
|[**historyControllerFindJournal**](#historycontrollerfindjournal) | **GET** /api/infoblocks/history/{listKey} | Журнал изменений списка|
|[**historyControllerFindRecord**](#historycontrollerfindrecord) | **GET** /api/infoblocks/history/{listKey}/{recordId} | История одной записи списка|

# **historyControllerClearJournal**
> HistoryClearDto historyControllerClearJournal()


### Example

```typescript
import {
    HistoryApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HistoryApi(configuration);

let listKey: string; //Ключ списка (default to undefined)

const { status, data } = await apiInstance.historyControllerClearJournal(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**HistoryClearDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список или у него нет журнала |  -  |
|**403** | Очищает журнал только главный администратор |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **historyControllerClearRecord**
> HistoryClearDto historyControllerClearRecord()


### Example

```typescript
import {
    HistoryApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HistoryApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let recordId: string; //Ключ записи: `2`, `element-7` (default to undefined)

const { status, data } = await apiInstance.historyControllerClearRecord(
    listKey,
    recordId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|
| **recordId** | [**string**] | Ключ записи: &#x60;2&#x60;, &#x60;element-7&#x60; | defaults to undefined|


### Return type

**HistoryClearDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список, неверный ключ записи или нет журнала |  -  |
|**403** | Очищает журнал только главный администратор |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **historyControllerFindJournal**
> HistoryPageDto historyControllerFindJournal()


### Example

```typescript
import {
    HistoryApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HistoryApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let limit: number; // (optional) (default to 20)
let offset: number; // (optional) (default to 0)

const { status, data } = await apiInstance.historyControllerFindJournal(
    listKey,
    limit,
    offset
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|
| **limit** | [**number**] |  | (optional) defaults to 20|
| **offset** | [**number**] |  | (optional) defaults to 0|


### Return type

**HistoryPageDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список или у него нет журнала |  -  |
|**403** | Журнал списка доступен только главному администратору |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **historyControllerFindRecord**
> Array<HistoryRecordDto> historyControllerFindRecord()


### Example

```typescript
import {
    HistoryApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HistoryApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let recordId: string; //Ключ записи: `2`, `element-7` (default to undefined)

const { status, data } = await apiInstance.historyControllerFindRecord(
    listKey,
    recordId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|
| **recordId** | [**string**] | Ключ записи: &#x60;2&#x60;, &#x60;element-7&#x60; | defaults to undefined|


### Return type

**Array<HistoryRecordDto>**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список, неверный ключ записи или нет журнала |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

