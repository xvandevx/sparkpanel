# InfoblockPropertiesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**infoblockPropertiesControllerCreate**](#infoblockpropertiescontrollercreate) | **POST** /api/infoblocks/settings/{listKey}/properties | Завести свойство|
|[**infoblockPropertiesControllerFindAll**](#infoblockpropertiescontrollerfindall) | **GET** /api/infoblocks/settings/{listKey}/properties | Свойства записей списка|
|[**infoblockPropertiesControllerRemove**](#infoblockpropertiescontrollerremove) | **DELETE** /api/infoblocks/settings/{listKey}/properties/{id} | Удалить свойство вместе со значениями у записей|
|[**infoblockPropertiesControllerUpdate**](#infoblockpropertiescontrollerupdate) | **PATCH** /api/infoblocks/settings/{listKey}/properties/{id} | Изменить свойство|

# **infoblockPropertiesControllerCreate**
> InfoblockPropertyDto infoblockPropertiesControllerCreate(infoblockPropertyDto)


### Example

```typescript
import {
    InfoblockPropertiesApi,
    Configuration,
    InfoblockPropertyDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockPropertiesApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let infoblockPropertyDto: InfoblockPropertyDto; //

const { status, data } = await apiInstance.infoblockPropertiesControllerCreate(
    listKey,
    infoblockPropertyDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **infoblockPropertyDto** | **InfoblockPropertyDto**|  | |
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**InfoblockPropertyDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Нет кода или названия, список без вариантов, чужая вкладка |  -  |
|**409** | Свойство с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **infoblockPropertiesControllerFindAll**
> Array<InfoblockPropertyDto> infoblockPropertiesControllerFindAll()


### Example

```typescript
import {
    InfoblockPropertiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockPropertiesApi(configuration);

let listKey: string; //Ключ списка (default to undefined)

const { status, data } = await apiInstance.infoblockPropertiesControllerFindAll(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка | defaults to undefined|


### Return type

**Array<InfoblockPropertyDto>**

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

# **infoblockPropertiesControllerRemove**
> infoblockPropertiesControllerRemove()


### Example

```typescript
import {
    InfoblockPropertiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockPropertiesApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let id: number; // (default to undefined)

const { status, data } = await apiInstance.infoblockPropertiesControllerRemove(
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
|**404** | Свойство не найдено |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **infoblockPropertiesControllerUpdate**
> InfoblockPropertyDto infoblockPropertiesControllerUpdate(updateInfoblockPropertyDto)


### Example

```typescript
import {
    InfoblockPropertiesApi,
    Configuration,
    UpdateInfoblockPropertyDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockPropertiesApi(configuration);

let listKey: string; //Ключ списка (default to undefined)
let id: number; // (default to undefined)
let updateInfoblockPropertyDto: UpdateInfoblockPropertyDto; //

const { status, data } = await apiInstance.infoblockPropertiesControllerUpdate(
    listKey,
    id,
    updateInfoblockPropertyDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateInfoblockPropertyDto** | **UpdateInfoblockPropertyDto**|  | |
| **listKey** | [**string**] | Ключ списка | defaults to undefined|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**InfoblockPropertyDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Свойство не найдено |  -  |
|**409** | Свойство с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

