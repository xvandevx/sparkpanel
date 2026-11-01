# PagesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**pagesControllerCreate**](#pagescontrollercreate) | **POST** /api/infoblocks/pages | Создать страницу; без parentId она встанет в корень сайта|
|[**pagesControllerFindAll**](#pagescontrollerfindall) | **GET** /api/infoblocks/pages | Все страницы пользователя плоским списком (дерево собирает фронт)|
|[**pagesControllerFindHistory**](#pagescontrollerfindhistory) | **GET** /api/infoblocks/pages/{id}/history | История изменений одной страницы|
|[**pagesControllerFindJournal**](#pagescontrollerfindjournal) | **GET** /api/infoblocks/pages/history | Общий журнал изменений раздела «Страницы»|
|[**pagesControllerFindOne**](#pagescontrollerfindone) | **GET** /api/infoblocks/pages/{id} | Одна страница|
|[**pagesControllerRemove**](#pagescontrollerremove) | **DELETE** /api/infoblocks/pages/{id} | Удалить страницу вместе со вложенными|
|[**pagesControllerUpdate**](#pagescontrollerupdate) | **PATCH** /api/infoblocks/pages/{id} | Изменить страницу; parentId: null — перенос в корень сайта|

# **pagesControllerCreate**
> PageDto pagesControllerCreate(createPageDto)


### Example

```typescript
import {
    PagesApi,
    Configuration,
    CreatePageDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let createPageDto: CreatePageDto; //

const { status, data } = await apiInstance.pagesControllerCreate(
    createPageDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createPageDto** | **CreatePageDto**|  | |


### Return type

**PageDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | У вложенной страницы пустой код |  -  |
|**409** | У соседней страницы уже есть такой код |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pagesControllerFindAll**
> Array<PageDto> pagesControllerFindAll()


### Example

```typescript
import {
    PagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

const { status, data } = await apiInstance.pagesControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<PageDto>**

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

# **pagesControllerFindHistory**
> Array<HistoryRecordDto> pagesControllerFindHistory()


### Example

```typescript
import {
    PagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.pagesControllerFindHistory(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] |  | defaults to undefined|


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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pagesControllerFindJournal**
> HistoryPageDto pagesControllerFindJournal()


### Example

```typescript
import {
    PagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let limit: number; // (optional) (default to 20)
let offset: number; // (optional) (default to 0)

const { status, data } = await apiInstance.pagesControllerFindJournal(
    limit,
    offset
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
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

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pagesControllerFindOne**
> PageDto pagesControllerFindOne()


### Example

```typescript
import {
    PagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.pagesControllerFindOne(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**PageDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Страница не найдена |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pagesControllerRemove**
> RemovedPagesDto pagesControllerRemove()


### Example

```typescript
import {
    PagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.pagesControllerRemove(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**RemovedPagesDto**

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

# **pagesControllerUpdate**
> PageDto pagesControllerUpdate(updatePageDto)


### Example

```typescript
import {
    PagesApi,
    Configuration,
    UpdatePageDto
} from './api';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let id: number; // (default to undefined)
let updatePageDto: UpdatePageDto; //

const { status, data } = await apiInstance.pagesControllerUpdate(
    id,
    updatePageDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updatePageDto** | **UpdatePageDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**PageDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Недопустимый перенос или пустой код у вложенной страницы |  -  |
|**409** | У соседней страницы уже есть такой код |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

