# FormsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**formsControllerCreate**](#formscontrollercreate) | **POST** /api/infoblocks/forms | Завести форму|
|[**formsControllerFindAll**](#formscontrollerfindall) | **GET** /api/infoblocks/forms | Все формы сайта|
|[**formsControllerRemove**](#formscontrollerremove) | **DELETE** /api/infoblocks/forms/{id} | Удалить форму вместе со значениями её свойств|
|[**formsControllerUpdate**](#formscontrollerupdate) | **PATCH** /api/infoblocks/forms/{id} | Изменить форму|

# **formsControllerCreate**
> FormDto formsControllerCreate(createFormDto)


### Example

```typescript
import {
    FormsApi,
    Configuration,
    CreateFormDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FormsApi(configuration);

let createFormDto: CreateFormDto; //

const { status, data } = await apiInstance.formsControllerCreate(
    createFormDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createFormDto** | **CreateFormDto**|  | |


### Return type

**FormDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**409** | Форма с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **formsControllerFindAll**
> Array<FormDto> formsControllerFindAll()


### Example

```typescript
import {
    FormsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FormsApi(configuration);

const { status, data } = await apiInstance.formsControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<FormDto>**

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

# **formsControllerRemove**
> formsControllerRemove()


### Example

```typescript
import {
    FormsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FormsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.formsControllerRemove(
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
|**404** | Форма не найдена |  -  |
|**409** | Форма выбрана в привязке другой записи |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **formsControllerUpdate**
> FormDto formsControllerUpdate(updateFormDto)


### Example

```typescript
import {
    FormsApi,
    Configuration,
    UpdateFormDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FormsApi(configuration);

let id: number; // (default to undefined)
let updateFormDto: UpdateFormDto; //

const { status, data } = await apiInstance.formsControllerUpdate(
    id,
    updateFormDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateFormDto** | **UpdateFormDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**FormDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Форма не найдена |  -  |
|**409** | Форма с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

