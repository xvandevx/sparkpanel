# SiteBackupsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**siteBackupsControllerCreate**](#sitebackupscontrollercreate) | **POST** /api/site-backups | Снять копию базы как она есть сейчас|
|[**siteBackupsControllerFile**](#sitebackupscontrollerfile) | **GET** /api/site-backups/{id}/file | Копия файлом: сжатый JSON|
|[**siteBackupsControllerFindAll**](#sitebackupscontrollerfindall) | **GET** /api/site-backups | Копии сайта, новые сверху, и размер базы|
|[**siteBackupsControllerRemove**](#sitebackupscontrollerremove) | **DELETE** /api/site-backups/{id} | Удалить копию|
|[**siteBackupsControllerRestore**](#sitebackupscontrollerrestore) | **POST** /api/site-backups/{id}/restore | Вернуть базу к копии. Ответ — копия того, что было до восстановления|
|[**siteBackupsControllerUpload**](#sitebackupscontrollerupload) | **POST** /api/site-backups/upload | Загрузить копию из файла — того, что выдаёт «Скачать»|

# **siteBackupsControllerCreate**
> SiteBackupDto siteBackupsControllerCreate()


### Example

```typescript
import {
    SiteBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SiteBackupsApi(configuration);

const { status, data } = await apiInstance.siteBackupsControllerCreate();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SiteBackupDto**

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

# **siteBackupsControllerFile**
> File siteBackupsControllerFile()


### Example

```typescript
import {
    SiteBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SiteBackupsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.siteBackupsControllerFile(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**File**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/gzip


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **siteBackupsControllerFindAll**
> SiteBackupsDto siteBackupsControllerFindAll()


### Example

```typescript
import {
    SiteBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SiteBackupsApi(configuration);

const { status, data } = await apiInstance.siteBackupsControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SiteBackupsDto**

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

# **siteBackupsControllerRemove**
> siteBackupsControllerRemove()


### Example

```typescript
import {
    SiteBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SiteBackupsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.siteBackupsControllerRemove(
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
|**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **siteBackupsControllerRestore**
> SiteBackupDto siteBackupsControllerRestore()


### Example

```typescript
import {
    SiteBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SiteBackupsApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.siteBackupsControllerRestore(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**number**] |  | defaults to undefined|


### Return type

**SiteBackupDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Копия не легла в нынешнюю схему — база не изменилась |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **siteBackupsControllerUpload**
> SiteBackupDto siteBackupsControllerUpload()


### Example

```typescript
import {
    SiteBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SiteBackupsApi(configuration);

let file: File; //Файл копии — `.json.gz` или `.json` (default to undefined)

const { status, data } = await apiInstance.siteBackupsControllerUpload(
    file
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **file** | [**File**] | Файл копии — &#x60;.json.gz&#x60; или &#x60;.json&#x60; | defaults to undefined|


### Return type

**SiteBackupDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Файл не передан или это не копия сайта |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

