# InfoblockDraftsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**draftsControllerDiscard**](#draftscontrollerdiscard) | **DELETE** /api/infoblocks/drafts/{listKey}/{recordId} | Удалить черновик: запись возвращается к опубликованному|
|[**draftsControllerFindOne**](#draftscontrollerfindone) | **GET** /api/infoblocks/drafts/{listKey}/{recordId} | Черновик одной записи|
|[**draftsControllerPublish**](#draftscontrollerpublish) | **POST** /api/infoblocks/drafts/{listKey}/{recordId}/publish | Снять опубликованный черновик: поля и значения уже записаны|
|[**draftsControllerSave**](#draftscontrollersave) | **PUT** /api/infoblocks/drafts/{listKey}/{recordId} | Сохранить черновик записи: изменённое относительно опубликованного|

# **draftsControllerDiscard**
> draftsControllerDiscard()


### Example

```typescript
import {
    InfoblockDraftsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDraftsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let recordId: string; //Ключ записи в списке (default to undefined)

const { status, data } = await apiInstance.draftsControllerDiscard(
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

void (empty response body)

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**409** | Запись ещё не публиковалась — её удаляют целиком |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **draftsControllerFindOne**
> RecordDraftStateDto draftsControllerFindOne()


### Example

```typescript
import {
    InfoblockDraftsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDraftsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let recordId: string; //Ключ записи в списке (default to undefined)

const { status, data } = await apiInstance.draftsControllerFindOne(
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

**RecordDraftStateDto**

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

# **draftsControllerPublish**
> draftsControllerPublish()


### Example

```typescript
import {
    InfoblockDraftsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDraftsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let recordId: string; //Ключ записи в списке (default to undefined)

const { status, data } = await apiInstance.draftsControllerPublish(
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

void (empty response body)

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **draftsControllerSave**
> RecordDraftDto draftsControllerSave(saveRecordDraftDto)


### Example

```typescript
import {
    InfoblockDraftsApi,
    Configuration,
    SaveRecordDraftDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDraftsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let recordId: string; //Ключ записи в списке (default to undefined)
let saveRecordDraftDto: SaveRecordDraftDto; //

const { status, data } = await apiInstance.draftsControllerSave(
    listKey,
    recordId,
    saveRecordDraftDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **saveRecordDraftDto** | **SaveRecordDraftDto**|  | |
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **recordId** | [**string**] | Ключ записи в списке | defaults to undefined|


### Return type

**RecordDraftDto**

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

