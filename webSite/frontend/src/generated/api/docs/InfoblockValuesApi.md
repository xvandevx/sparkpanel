# InfoblockValuesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**infoblockValuesControllerFindOne**](#infoblockvaluescontrollerfindone) | **GET** /api/infoblocks/{listKey}/values/{recordId} | Значения свойств одной записи|
|[**infoblockValuesControllerRemove**](#infoblockvaluescontrollerremove) | **DELETE** /api/infoblocks/{listKey}/values | Стереть значения свойств удалённых записей|
|[**infoblockValuesControllerSave**](#infoblockvaluescontrollersave) | **PATCH** /api/infoblocks/{listKey}/values/{recordId} | Сохранить изменённые значения свойств записи|

# **infoblockValuesControllerFindOne**
> RecordValuesDto infoblockValuesControllerFindOne()


### Example

```typescript
import {
    InfoblockValuesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockValuesApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let recordId: string; //Ключ записи в списке (default to undefined)

const { status, data } = await apiInstance.infoblockValuesControllerFindOne(
    listKey,
    recordId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **recordId** | [**string**] | Ключ записи в списке | defaults to undefined|


### Return type

**RecordValuesDto**

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

# **infoblockValuesControllerRemove**
> RemovedPropertyValuesDto infoblockValuesControllerRemove()


### Example

```typescript
import {
    InfoblockValuesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockValuesApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let recordIds: string; //Ключи записей через запятую (default to undefined)

const { status, data } = await apiInstance.infoblockValuesControllerRemove(
    listKey,
    recordIds
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **recordIds** | [**string**] | Ключи записей через запятую | defaults to undefined|


### Return type

**RemovedPropertyValuesDto**

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

# **infoblockValuesControllerSave**
> RecordValuesDto infoblockValuesControllerSave(updatePropertyValuesDto)


### Example

```typescript
import {
    InfoblockValuesApi,
    Configuration,
    UpdatePropertyValuesDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockValuesApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let recordId: string; //Ключ записи в списке (default to undefined)
let updatePropertyValuesDto: UpdatePropertyValuesDto; //

const { status, data } = await apiInstance.infoblockValuesControllerSave(
    listKey,
    recordId,
    updatePropertyValuesDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updatePropertyValuesDto** | **UpdatePropertyValuesDto**|  | |
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **recordId** | [**string**] | Ключ записи в списке | defaults to undefined|


### Return type

**RecordValuesDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Значение не подходит под свойство |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

