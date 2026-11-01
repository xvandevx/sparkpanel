# InfoblockDomainsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**domainsControllerCreate**](#domainscontrollercreate) | **POST** /api/infoblocks/domains | Добавить домен; с parentId — поддомен, у него указывается только его имя|
|[**domainsControllerFindAll**](#domainscontrollerfindall) | **GET** /api/infoblocks/domains | Домены и поддомены плоским списком (дерево собирает фронт), с полными адресами|
|[**domainsControllerRemove**](#domainscontrollerremove) | **DELETE** /api/infoblocks/domains/{id} | Удалить домен без поддоменов|
|[**domainsControllerUpdate**](#domainscontrollerupdate) | **PATCH** /api/infoblocks/domains/{id} | Изменить или перенести домен; адреса его поддоменов складываются заново|

# **domainsControllerCreate**
> DomainDto domainsControllerCreate(createDomainDto)


### Example

```typescript
import {
    InfoblockDomainsApi,
    Configuration,
    CreateDomainDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDomainsApi(configuration);

let createDomainDto: CreateDomainDto; //

const { status, data } = await apiInstance.domainsControllerCreate(
    createDomainDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createDomainDto** | **CreateDomainDto**|  | |


### Return type

**DomainDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неверное имя или глубже предела вложенности |  -  |
|**404** | Родительский домен не найден |  -  |
|**409** | Домен с таким адресом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **domainsControllerFindAll**
> Array<DomainDto> domainsControllerFindAll()


### Example

```typescript
import {
    InfoblockDomainsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDomainsApi(configuration);

const { status, data } = await apiInstance.domainsControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<DomainDto>**

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

# **domainsControllerRemove**
> domainsControllerRemove()


### Example

```typescript
import {
    InfoblockDomainsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDomainsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.domainsControllerRemove(
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
|**404** | Домен не найден |  -  |
|**409** | У домена есть поддомены |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **domainsControllerUpdate**
> DomainDto domainsControllerUpdate(updateDomainDto)


### Example

```typescript
import {
    InfoblockDomainsApi,
    Configuration,
    UpdateDomainDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockDomainsApi(configuration);

let id: number; // (default to undefined)
let updateDomainDto: UpdateDomainDto; //

const { status, data } = await apiInstance.domainsControllerUpdate(
    id,
    updateDomainDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateDomainDto** | **UpdateDomainDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**DomainDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Неверное имя, перенос в свою ветку или глубже предела |  -  |
|**404** | Домен не найден |  -  |
|**409** | Адрес совпал бы с адресом другого домена |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

