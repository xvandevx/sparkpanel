# InfoblockColumnsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**infoblockColumnsControllerFindAll**](#infoblockcolumnscontrollerfindall) | **GET** /api/infoblocks/settings/{listKey}/columns | Видимые колонки таблицы по порядку; пусто — колонки по умолчанию|
|[**infoblockColumnsControllerReset**](#infoblockcolumnscontrollerreset) | **DELETE** /api/infoblocks/settings/{listKey}/columns | Вернуть колонки по умолчанию|
|[**infoblockColumnsControllerSave**](#infoblockcolumnscontrollersave) | **PUT** /api/infoblocks/settings/{listKey}/columns | Сохранить вид таблицы целиком: видимые колонки слева направо|

# **infoblockColumnsControllerFindAll**
> Array<InfoblockColumnDto> infoblockColumnsControllerFindAll()


### Example

```typescript
import {
    InfoblockColumnsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockColumnsApi(configuration);

let listKey: string; //Ключ списка (default to undefined)

const { status, data } = await apiInstance.infoblockColumnsControllerFindAll(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**Array<InfoblockColumnDto>**

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

# **infoblockColumnsControllerReset**
> infoblockColumnsControllerReset()


### Example

```typescript
import {
    InfoblockColumnsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockColumnsApi(configuration);

let listKey: string; //Ключ списка (default to undefined)

const { status, data } = await apiInstance.infoblockColumnsControllerReset(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Сохранённый вид таблицы стёрт |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **infoblockColumnsControllerSave**
> Array<InfoblockColumnDto> infoblockColumnsControllerSave(saveInfoblockColumnsDto)


### Example

```typescript
import {
    InfoblockColumnsApi,
    Configuration,
    SaveInfoblockColumnsDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockColumnsApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let saveInfoblockColumnsDto: SaveInfoblockColumnsDto; //

const { status, data } = await apiInstance.infoblockColumnsControllerSave(
    listKey,
    saveInfoblockColumnsDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **saveInfoblockColumnsDto** | **SaveInfoblockColumnsDto**|  | |
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**Array<InfoblockColumnDto>**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список или колонки описаны с ошибкой |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

