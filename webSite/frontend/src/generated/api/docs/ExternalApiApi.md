# ExternalApiApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiKeysControllerCreateKey**](#apikeyscontrollercreatekey) | **POST** /api/external-api/keys | Создать ключ. Ответ — единственный раз, когда ключ виден целиком|
|[**apiKeysControllerFindKeys**](#apikeyscontrollerfindkeys) | **GET** /api/external-api/keys | Ключи внешнего API, новые сверху|
|[**apiKeysControllerRemoveKey**](#apikeyscontrollerremovekey) | **DELETE** /api/external-api/keys/{id} | Отозвать ключ — он сразу перестаёт работать|
|[**apiKeysControllerSpec**](#apikeyscontrollerspec) | **GET** /api/external-api/openapi | Спецификация внешнего API (OpenAPI 3.1) — та же, что по ключу из /api/v1/openapi.json|

# **apiKeysControllerCreateKey**
> CreatedApiKeyDto apiKeysControllerCreateKey(createApiKeyDto)


### Example

```typescript
import {
    ExternalApiApi,
    Configuration,
    CreateApiKeyDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ExternalApiApi(configuration);

let createApiKeyDto: CreateApiKeyDto; //

const { status, data } = await apiInstance.apiKeysControllerCreateKey(
    createApiKeyDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createApiKeyDto** | **CreateApiKeyDto**|  | |


### Return type

**CreatedApiKeyDto**

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

# **apiKeysControllerFindKeys**
> Array<ApiKeyDto> apiKeysControllerFindKeys()


### Example

```typescript
import {
    ExternalApiApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ExternalApiApi(configuration);

const { status, data } = await apiInstance.apiKeysControllerFindKeys();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ApiKeyDto>**

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

# **apiKeysControllerRemoveKey**
> apiKeysControllerRemoveKey()


### Example

```typescript
import {
    ExternalApiApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ExternalApiApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.apiKeysControllerRemoveKey(
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
|**404** | Ключа нет |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiKeysControllerSpec**
> { [key: string]: any; } apiKeysControllerSpec()


### Example

```typescript
import {
    ExternalApiApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ExternalApiApi(configuration);

const { status, data } = await apiInstance.apiKeysControllerSpec();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**{ [key: string]: any; }**

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

