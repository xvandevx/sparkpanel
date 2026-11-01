# SettingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**settingsControllerFind**](#settingscontrollerfind) | **GET** /api/settings | Настройки сайта|
|[**settingsControllerUpdate**](#settingscontrollerupdate) | **PATCH** /api/settings | Изменить настройки сайта: только присланное|

# **settingsControllerFind**
> SettingsDto settingsControllerFind()


### Example

```typescript
import {
    SettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SettingsApi(configuration);

const { status, data } = await apiInstance.settingsControllerFind();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SettingsDto**

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

# **settingsControllerUpdate**
> SettingsDto settingsControllerUpdate(updateSettingsDto)


### Example

```typescript
import {
    SettingsApi,
    Configuration,
    UpdateSettingsDto
} from './api';

const configuration = new Configuration();
const apiInstance = new SettingsApi(configuration);

let updateSettingsDto: UpdateSettingsDto; //

const { status, data } = await apiInstance.settingsControllerUpdate(
    updateSettingsDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateSettingsDto** | **UpdateSettingsDto**|  | |


### Return type

**SettingsDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Внешнее хранилище заполнено не до конца или не отвечает |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

