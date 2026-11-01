# InfoblockRolesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**rolesControllerCreate**](#rolescontrollercreate) | **POST** /api/infoblocks/roles | Завести роль|
|[**rolesControllerFindAll**](#rolescontrollerfindall) | **GET** /api/infoblocks/roles | Все роли пользователей|
|[**rolesControllerRemove**](#rolescontrollerremove) | **DELETE** /api/infoblocks/roles/{id} | Удалить роль, которую никому не назначили|
|[**rolesControllerUpdate**](#rolescontrollerupdate) | **PATCH** /api/infoblocks/roles/{id} | Изменить роль|

# **rolesControllerCreate**
> RoleDto rolesControllerCreate(createRoleDto)


### Example

```typescript
import {
    InfoblockRolesApi,
    Configuration,
    CreateRoleDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockRolesApi(configuration);

let createRoleDto: CreateRoleDto; //

const { status, data } = await apiInstance.rolesControllerCreate(
    createRoleDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createRoleDto** | **CreateRoleDto**|  | |


### Return type

**RoleDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**403** | Доступно только главному администратору |  -  |
|**409** | Роль с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **rolesControllerFindAll**
> Array<RoleDto> rolesControllerFindAll()


### Example

```typescript
import {
    InfoblockRolesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockRolesApi(configuration);

const { status, data } = await apiInstance.rolesControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<RoleDto>**

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

# **rolesControllerRemove**
> rolesControllerRemove()


### Example

```typescript
import {
    InfoblockRolesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockRolesApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.rolesControllerRemove(
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
|**403** | Доступно только главному администратору |  -  |
|**404** | Роль не найдена |  -  |
|**409** | Роль назначена пользователям |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **rolesControllerUpdate**
> RoleDto rolesControllerUpdate(updateRoleDto)


### Example

```typescript
import {
    InfoblockRolesApi,
    Configuration,
    UpdateRoleDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockRolesApi(configuration);

let id: number; // (default to undefined)
let updateRoleDto: UpdateRoleDto; //

const { status, data } = await apiInstance.rolesControllerUpdate(
    id,
    updateRoleDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateRoleDto** | **UpdateRoleDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**RoleDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**403** | Доступно только главному администратору |  -  |
|**404** | Роль не найдена |  -  |
|**409** | Роль с таким кодом уже есть |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

