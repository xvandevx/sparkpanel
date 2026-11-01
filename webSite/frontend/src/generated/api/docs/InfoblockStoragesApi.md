# InfoblockStoragesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**storagesControllerCreate**](#storagescontrollercreate) | **POST** /api/infoblocks/storages | Добавить хранилище; подключение — значениями свойств|
|[**storagesControllerFindAll**](#storagescontrollerfindall) | **GET** /api/infoblocks/storages | Внешние хранилища|
|[**storagesControllerRemove**](#storagescontrollerremove) | **DELETE** /api/infoblocks/storages/{id} | Удалить свободное хранилище|
|[**storagesControllerUpdate**](#storagescontrollerupdate) | **PATCH** /api/infoblocks/storages/{id} | Поправить хранилище: название, активность, сортировку|

# **storagesControllerCreate**
> StorageDto storagesControllerCreate(saveStorageDto)


### Example

```typescript
import {
    InfoblockStoragesApi,
    Configuration,
    SaveStorageDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockStoragesApi(configuration);

let saveStorageDto: SaveStorageDto; //

const { status, data } = await apiInstance.storagesControllerCreate(
    saveStorageDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **saveStorageDto** | **SaveStorageDto**|  | |


### Return type

**StorageDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Не заполнено название |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **storagesControllerFindAll**
> Array<StorageDto> storagesControllerFindAll()


### Example

```typescript
import {
    InfoblockStoragesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockStoragesApi(configuration);

const { status, data } = await apiInstance.storagesControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<StorageDto>**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **storagesControllerRemove**
> storagesControllerRemove()


### Example

```typescript
import {
    InfoblockStoragesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockStoragesApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.storagesControllerRemove(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] |  | defaults to undefined|


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
|**404** | Хранилище не найдено |  -  |
|**409** | Выбрано для новых файлов или в нём лежат файлы |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **storagesControllerUpdate**
> StorageDto storagesControllerUpdate(updateStorageDto)


### Example

```typescript
import {
    InfoblockStoragesApi,
    Configuration,
    UpdateStorageDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockStoragesApi(configuration);

let id: number; // (default to undefined)
let updateStorageDto: UpdateStorageDto; //

const { status, data } = await apiInstance.storagesControllerUpdate(
    id,
    updateStorageDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateStorageDto** | **UpdateStorageDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**StorageDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Хранилище не найдено |  -  |
|**409** | Выключают хранилище, выбранное для новых файлов |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

