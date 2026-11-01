# AuthApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**authControllerCreateRoot**](#authcontrollercreateroot) | **POST** /api/auth/setup | Создать главного администратора (только пока его нет)|
|[**authControllerDevLogin**](#authcontrollerdevlogin) | **POST** /api/auth/dev-login | Локальный вход без пароля под главным администратором (только DEV_LOGIN&#x3D;true)|
|[**authControllerGetSetupStatus**](#authcontrollergetsetupstatus) | **GET** /api/auth/setup | Нужна ли первичная настройка (есть ли главный администратор)|
|[**authControllerLogin**](#authcontrollerlogin) | **POST** /api/auth/login | Вход по email и паролю|
|[**authControllerMe**](#authcontrollerme) | **GET** /api/auth/me | Текущий пользователь по токену|

# **authControllerCreateRoot**
> LoginResponseDto authControllerCreateRoot(createRootDto)


### Example

```typescript
import {
    AuthApi,
    Configuration,
    CreateRootDto
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let createRootDto: CreateRootDto; //

const { status, data } = await apiInstance.authControllerCreateRoot(
    createRootDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createRootDto** | **CreateRootDto**|  | |


### Return type

**LoginResponseDto**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**409** | Главный администратор уже создан |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerDevLogin**
> LoginResponseDto authControllerDevLogin()


### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.authControllerDevLogin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**LoginResponseDto**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Вход без пароля выключен |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerGetSetupStatus**
> SetupStatusDto authControllerGetSetupStatus()


### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.authControllerGetSetupStatus();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SetupStatusDto**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerLogin**
> LoginResponseDto authControllerLogin(loginDto)


### Example

```typescript
import {
    AuthApi,
    Configuration,
    LoginDto
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let loginDto: LoginDto; //

const { status, data } = await apiInstance.authControllerLogin(
    loginDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **loginDto** | **LoginDto**|  | |


### Return type

**LoginResponseDto**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**401** | Неверный email или пароль |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authControllerMe**
> UserDto authControllerMe()


### Example

```typescript
import {
    AuthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.authControllerMe();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**UserDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**401** | Токен отсутствует, истёк или недействителен |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

