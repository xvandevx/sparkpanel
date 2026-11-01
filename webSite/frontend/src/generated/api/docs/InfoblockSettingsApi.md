# InfoblockSettingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**infoblockSettingsControllerFindLinkSources**](#infoblocksettingscontrollerfindlinksources) | **GET** /api/infoblocks/settings/link-sources | Списки-источники привязки: страницы, типы контента, роли, товары и категории|
|[**infoblockSettingsControllerFindLinkTargets**](#infoblocksettingscontrollerfindlinktargets) | **GET** /api/infoblocks/settings/link-targets | Записи для привязок — только из указанных списков|
|[**infoblockSettingsControllerFindOne**](#infoblocksettingscontrollerfindone) | **GET** /api/infoblocks/settings/{listKey} | Настройки списка: имя, код и свойства записей|
|[**infoblockSettingsControllerFindOptionSources**](#infoblocksettingscontrollerfindoptionsources) | **GET** /api/infoblocks/settings/option-sources | Свойства-«Списки» всех доступных списков: на их варианты смотрит привязка к значениям списка|
|[**infoblockSettingsControllerSave**](#infoblocksettingscontrollersave) | **PUT** /api/infoblocks/settings/{listKey} | Сохранить настройки списка целиком|

# **infoblockSettingsControllerFindLinkSources**
> Array<LinkSourceDto> infoblockSettingsControllerFindLinkSources()


### Example

```typescript
import {
    InfoblockSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockSettingsApi(configuration);

const { status, data } = await apiInstance.infoblockSettingsControllerFindLinkSources();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<LinkSourceDto>**

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

# **infoblockSettingsControllerFindLinkTargets**
> Array<LinkTargetDto> infoblockSettingsControllerFindLinkTargets()


### Example

```typescript
import {
    InfoblockSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockSettingsApi(configuration);

let listKeys: string; //Ключи списков через запятую; не указаны — ответ пустой (optional) (default to undefined)

const { status, data } = await apiInstance.infoblockSettingsControllerFindLinkTargets(
    listKeys
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKeys** | [**string**] | Ключи списков через запятую; не указаны — ответ пустой | (optional) defaults to undefined|


### Return type

**Array<LinkTargetDto>**

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

# **infoblockSettingsControllerFindOne**
> InfoblockSettingsDto infoblockSettingsControllerFindOne()


### Example

```typescript
import {
    InfoblockSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockSettingsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)

const { status, data } = await apiInstance.infoblockSettingsControllerFindOne(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|


### Return type

**InfoblockSettingsDto**

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

# **infoblockSettingsControllerFindOptionSources**
> Array<OptionSourceDto> infoblockSettingsControllerFindOptionSources()


### Example

```typescript
import {
    InfoblockSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockSettingsApi(configuration);

const { status, data } = await apiInstance.infoblockSettingsControllerFindOptionSources();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<OptionSourceDto>**

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

# **infoblockSettingsControllerSave**
> InfoblockSettingsDto infoblockSettingsControllerSave(updateInfoblockSettingsDto)


### Example

```typescript
import {
    InfoblockSettingsApi,
    Configuration,
    UpdateInfoblockSettingsDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockSettingsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let updateInfoblockSettingsDto: UpdateInfoblockSettingsDto; //

const { status, data } = await apiInstance.infoblockSettingsControllerSave(
    listKey,
    updateInfoblockSettingsDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateInfoblockSettingsDto** | **UpdateInfoblockSettingsDto**|  | |
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|


### Return type

**InfoblockSettingsDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неизвестный список или свойства описаны с ошибкой |  -  |
|**409** | Список с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

