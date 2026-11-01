# FormFieldsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**formFieldsControllerCreate**](#formfieldscontrollercreate) | **POST** /api/infoblocks/forms/fields | Завести поле|
|[**formFieldsControllerFindAll**](#formfieldscontrollerfindall) | **GET** /api/infoblocks/forms/fields | Все поля форм сайта|
|[**formFieldsControllerRemove**](#formfieldscontrollerremove) | **DELETE** /api/infoblocks/forms/fields/{id} | Удалить поле, которое не подключено ни к одной форме|
|[**formFieldsControllerUpdate**](#formfieldscontrollerupdate) | **PATCH** /api/infoblocks/forms/fields/{id} | Изменить поле|

# **formFieldsControllerCreate**
> FormFieldDto formFieldsControllerCreate(createFormFieldDto)


### Example

```typescript
import {
    FormFieldsApi,
    Configuration,
    CreateFormFieldDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FormFieldsApi(configuration);

let createFormFieldDto: CreateFormFieldDto; //

const { status, data } = await apiInstance.formFieldsControllerCreate(
    createFormFieldDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createFormFieldDto** | **CreateFormFieldDto**|  | |


### Return type

**FormFieldDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**409** | Поле с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **formFieldsControllerFindAll**
> Array<FormFieldDto> formFieldsControllerFindAll()


### Example

```typescript
import {
    FormFieldsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FormFieldsApi(configuration);

const { status, data } = await apiInstance.formFieldsControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<FormFieldDto>**

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

# **formFieldsControllerRemove**
> formFieldsControllerRemove()


### Example

```typescript
import {
    FormFieldsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FormFieldsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.formFieldsControllerRemove(
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
|**404** | Поле не найдено |  -  |
|**409** | Поле подключено к формам |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **formFieldsControllerUpdate**
> FormFieldDto formFieldsControllerUpdate(updateFormFieldDto)


### Example

```typescript
import {
    FormFieldsApi,
    Configuration,
    UpdateFormFieldDto
} from './api';

const configuration = new Configuration();
const apiInstance = new FormFieldsApi(configuration);

let id: number; // (default to undefined)
let updateFormFieldDto: UpdateFormFieldDto; //

const { status, data } = await apiInstance.formFieldsControllerUpdate(
    id,
    updateFormFieldDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateFormFieldDto** | **UpdateFormFieldDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**FormFieldDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Поле не найдено |  -  |
|**409** | Поле с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

