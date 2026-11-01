# ContentsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**contentsControllerCreate**](#contentscontrollercreate) | **POST** /api/infoblocks/contents | Завести тип контента|
|[**contentsControllerFindAll**](#contentscontrollerfindall) | **GET** /api/infoblocks/contents | Типы контента пользователя|
|[**contentsControllerRemove**](#contentscontrollerremove) | **DELETE** /api/infoblocks/contents/{id} | Удалить пустой тип контента|
|[**contentsControllerUpdate**](#contentscontrollerupdate) | **PATCH** /api/infoblocks/contents/{id} | Изменить тип контента|

# **contentsControllerCreate**
> ContentDto contentsControllerCreate(createContentDto)


### Example

```typescript
import {
    ContentsApi,
    Configuration,
    CreateContentDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentsApi(configuration);

let createContentDto: CreateContentDto; //

const { status, data } = await apiInstance.contentsControllerCreate(
    createContentDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createContentDto** | **CreateContentDto**|  | |


### Return type

**ContentDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentsControllerFindAll**
> Array<ContentDto> contentsControllerFindAll()


### Example

```typescript
import {
    ContentsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentsApi(configuration);

const { status, data } = await apiInstance.contentsControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ContentDto>**

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

# **contentsControllerRemove**
> contentsControllerRemove()


### Example

```typescript
import {
    ContentsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.contentsControllerRemove(
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
|**404** | Тип не найден |  -  |
|**409** | В типе есть элементы или вложенные типы |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentsControllerUpdate**
> ContentDto contentsControllerUpdate(updateContentDto)


### Example

```typescript
import {
    ContentsApi,
    Configuration,
    UpdateContentDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentsApi(configuration);

let id: number; // (default to undefined)
let updateContentDto: UpdateContentDto; //

const { status, data } = await apiInstance.contentsControllerUpdate(
    id,
    updateContentDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateContentDto** | **UpdateContentDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**ContentDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Тип не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

