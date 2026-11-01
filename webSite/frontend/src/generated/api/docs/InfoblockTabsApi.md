# InfoblockTabsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**infoblockTabsControllerCreate**](#infoblocktabscontrollercreate) | **POST** /api/infoblocks/settings/{listKey}/tabs | Завести вкладку|
|[**infoblockTabsControllerFindAll**](#infoblocktabscontrollerfindall) | **GET** /api/infoblocks/settings/{listKey}/tabs | Вкладки карточки записи|
|[**infoblockTabsControllerRemove**](#infoblocktabscontrollerremove) | **DELETE** /api/infoblocks/settings/{listKey}/tabs/{id} | Удалить вкладку; её свойства переходят на общую вкладку «Свойства»|
|[**infoblockTabsControllerRename**](#infoblocktabscontrollerrename) | **PATCH** /api/infoblocks/settings/{listKey}/tabs/{id} | Переименовать вкладку|

# **infoblockTabsControllerCreate**
> InfoblockTabDto infoblockTabsControllerCreate(createInfoblockTabDto)


### Example

```typescript
import {
    InfoblockTabsApi,
    Configuration,
    CreateInfoblockTabDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockTabsApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let createInfoblockTabDto: CreateInfoblockTabDto; //

const { status, data } = await apiInstance.infoblockTabsControllerCreate(
    listKey,
    createInfoblockTabDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createInfoblockTabDto** | **CreateInfoblockTabDto**|  | |
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**InfoblockTabDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**409** | Вкладка с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **infoblockTabsControllerFindAll**
> Array<InfoblockTabDto> infoblockTabsControllerFindAll()


### Example

```typescript
import {
    InfoblockTabsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockTabsApi(configuration);

let listKey: string; //Ключ списка (default to undefined)

const { status, data } = await apiInstance.infoblockTabsControllerFindAll(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**Array<InfoblockTabDto>**

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

# **infoblockTabsControllerRemove**
> infoblockTabsControllerRemove()


### Example

```typescript
import {
    InfoblockTabsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockTabsApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let id: number; // (default to undefined)

const { status, data } = await apiInstance.infoblockTabsControllerRemove(
    listKey,
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|
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
|**404** | Вкладка не найдена |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **infoblockTabsControllerRename**
> InfoblockTabDto infoblockTabsControllerRename(updateInfoblockTabDto)


### Example

```typescript
import {
    InfoblockTabsApi,
    Configuration,
    UpdateInfoblockTabDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockTabsApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let id: number; // (default to undefined)
let updateInfoblockTabDto: UpdateInfoblockTabDto; //

const { status, data } = await apiInstance.infoblockTabsControllerRename(
    listKey,
    id,
    updateInfoblockTabDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateInfoblockTabDto** | **UpdateInfoblockTabDto**|  | |
| **listKey** | [**string**] | Ключ списка | defaults to undefined|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**InfoblockTabDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Вкладка не найдена |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

