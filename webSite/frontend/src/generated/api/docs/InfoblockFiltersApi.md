# InfoblockFiltersApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**infoblockFiltersControllerFindAll**](#infoblockfilterscontrollerfindall) | **GET** /api/infoblocks/settings/{listKey}/filters | Ключи полей фильтра по порядку; пусто — фильтра нет|
|[**infoblockFiltersControllerSave**](#infoblockfilterscontrollersave) | **PUT** /api/infoblocks/settings/{listKey}/filters | Сохранить набор полей фильтра целиком; пустой — убрать фильтр|

# **infoblockFiltersControllerFindAll**
> Array<string> infoblockFiltersControllerFindAll()


### Example

```typescript
import {
    InfoblockFiltersApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockFiltersApi(configuration);

let listKey: string; //Ключ списка (default to undefined)

const { status, data } = await apiInstance.infoblockFiltersControllerFindAll(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**Array<string>**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **infoblockFiltersControllerSave**
> Array<string> infoblockFiltersControllerSave(saveInfoblockFiltersDto)


### Example

```typescript
import {
    InfoblockFiltersApi,
    Configuration,
    SaveInfoblockFiltersDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockFiltersApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let saveInfoblockFiltersDto: SaveInfoblockFiltersDto; //

const { status, data } = await apiInstance.infoblockFiltersControllerSave(
    listKey,
    saveInfoblockFiltersDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **saveInfoblockFiltersDto** | **SaveInfoblockFiltersDto**|  | |
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**Array<string>**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список или ключи с ошибкой |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

