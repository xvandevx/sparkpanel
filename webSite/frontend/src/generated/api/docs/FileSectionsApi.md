# FileSectionsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**fileSectionsControllerCreate**](#filesectionscontrollercreate) | **POST** /api/infoblocks/files/sections | Создать раздел; без parentId он встанет в корень|
|[**fileSectionsControllerFindAll**](#filesectionscontrollerfindall) | **GET** /api/infoblocks/files/sections | Разделы файлов плоским списком (дерево собирает фронт)|
|[**fileSectionsControllerRemove**](#filesectionscontrollerremove) | **DELETE** /api/infoblocks/files/sections/{id} | Удалить пустой раздел|
|[**fileSectionsControllerUpdate**](#filesectionscontrollerupdate) | **PATCH** /api/infoblocks/files/sections/{id} | Переименовать или перенести раздел; parentId: null — в корень|

# **fileSectionsControllerCreate**
> FileSectionDto fileSectionsControllerCreate(createFileSectionDto)


### Example

```typescript
import {
    FileSectionsApi,
    Configuration,
    CreateFileSectionDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FileSectionsApi(configuration);

let createFileSectionDto: CreateFileSectionDto; //

const { status, data } = await apiInstance.fileSectionsControllerCreate(
    createFileSectionDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createFileSectionDto** | **CreateFileSectionDto**|  | |


### Return type

**FileSectionDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Родитель не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **fileSectionsControllerFindAll**
> Array<FileSectionDto> fileSectionsControllerFindAll()


### Example

```typescript
import {
    FileSectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FileSectionsApi(configuration);

const { status, data } = await apiInstance.fileSectionsControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<FileSectionDto>**

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

# **fileSectionsControllerRemove**
> fileSectionsControllerRemove()


### Example

```typescript
import {
    FileSectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FileSectionsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.fileSectionsControllerRemove(
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
|**404** | Раздел не найден |  -  |
|**409** | Раздел свойства, или в нём есть файлы или разделы |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **fileSectionsControllerUpdate**
> FileSectionDto fileSectionsControllerUpdate(updateFileSectionDto)


### Example

```typescript
import {
    FileSectionsApi,
    Configuration,
    UpdateFileSectionDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FileSectionsApi(configuration);

let id: number; // (default to undefined)
let updateFileSectionDto: UpdateFileSectionDto; //

const { status, data } = await apiInstance.fileSectionsControllerUpdate(
    id,
    updateFileSectionDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateFileSectionDto** | **UpdateFileSectionDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**FileSectionDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Перенос внутрь собственной ветки |  -  |
|**404** | Раздел не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

