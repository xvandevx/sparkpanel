# ContentItemsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**contentItemsControllerCreate**](#contentitemscontrollercreate) | **POST** /api/infoblocks/contents/{contentId}/items | Завести элемент в типе|
|[**contentItemsControllerFindAll**](#contentitemscontrollerfindall) | **GET** /api/infoblocks/contents/{contentId}/items | Элементы типа контента|
|[**contentItemsControllerRemove**](#contentitemscontrollerremove) | **DELETE** /api/infoblocks/contents/{contentId}/items/{id} | Удалить элемент вместе со значениями его свойств|
|[**contentItemsControllerUpdate**](#contentitemscontrollerupdate) | **PATCH** /api/infoblocks/contents/{contentId}/items/{id} | Изменить элемент|

# **contentItemsControllerCreate**
> ContentItemDto contentItemsControllerCreate(createContentItemDto)


### Example

```typescript
import {
    ContentItemsApi,
    Configuration,
    CreateContentItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentItemsApi(configuration);

let contentId: number; // (default to undefined)
let createContentItemDto: CreateContentItemDto; //

const { status, data } = await apiInstance.contentItemsControllerCreate(
    contentId,
    createContentItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createContentItemDto** | **CreateContentItemDto**|  | |
| **contentId** | [**number**] |  | defaults to undefined|


### Return type

**ContentItemDto**

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

# **contentItemsControllerFindAll**
> Array<ContentItemDto> contentItemsControllerFindAll()


### Example

```typescript
import {
    ContentItemsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentItemsApi(configuration);

let contentId: number; // (default to undefined)

const { status, data } = await apiInstance.contentItemsControllerFindAll(
    contentId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **contentId** | [**number**] |  | defaults to undefined|


### Return type

**Array<ContentItemDto>**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Тип не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentItemsControllerRemove**
> contentItemsControllerRemove()


### Example

```typescript
import {
    ContentItemsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentItemsApi(configuration);

let contentId: number; // (default to undefined)
let id: number; // (default to undefined)

const { status, data } = await apiInstance.contentItemsControllerRemove(
    contentId,
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **contentId** | [**number**] |  | defaults to undefined|
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
|**404** | Элемент не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **contentItemsControllerUpdate**
> ContentItemDto contentItemsControllerUpdate(updateContentItemDto)


### Example

```typescript
import {
    ContentItemsApi,
    Configuration,
    UpdateContentItemDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ContentItemsApi(configuration);

let contentId: number; // (default to undefined)
let id: number; // (default to undefined)
let updateContentItemDto: UpdateContentItemDto; //

const { status, data } = await apiInstance.contentItemsControllerUpdate(
    contentId,
    id,
    updateContentItemDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateContentItemDto** | **UpdateContentItemDto**|  | |
| **contentId** | [**number**] |  | defaults to undefined|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**ContentItemDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Элемент не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

