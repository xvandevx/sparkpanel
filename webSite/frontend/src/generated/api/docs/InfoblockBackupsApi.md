# InfoblockBackupsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**backupsControllerCheck**](#backupscontrollercheck) | **GET** /api/infoblocks/backups/{listKey}/{id}/check | Что изменится, если вернуть копию|
|[**backupsControllerCreate**](#backupscontrollercreate) | **POST** /api/infoblocks/backups/{listKey} | Снять копию списка как он есть сейчас|
|[**backupsControllerFile**](#backupscontrollerfile) | **GET** /api/infoblocks/backups/{listKey}/{id}/file | Копия целиком — для файла|
|[**backupsControllerFindAll**](#backupscontrollerfindall) | **GET** /api/infoblocks/backups/{listKey} | Копии списка, новые сверху|
|[**backupsControllerRemove**](#backupscontrollerremove) | **DELETE** /api/infoblocks/backups/{listKey}/{id} | Удалить копию|
|[**backupsControllerRestore**](#backupscontrollerrestore) | **POST** /api/infoblocks/backups/{listKey}/{id}/restore | Вернуть копию. Ответ — копия того, что было до восстановления|
|[**backupsControllerUpload**](#backupscontrollerupload) | **POST** /api/infoblocks/backups/{listKey}/upload | Загрузить копию из файла — того, что выдаёт «Скачать»|

# **backupsControllerCheck**
> BackupCheckDto backupsControllerCheck()


### Example

```typescript
import {
    InfoblockBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockBackupsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let id: number; //Номер копии (default to undefined)

const { status, data } = await apiInstance.backupsControllerCheck(
    listKey,
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **id** | [**number**] | Номер копии | defaults to undefined|


### Return type

**BackupCheckDto**

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

# **backupsControllerCreate**
> BackupDto backupsControllerCreate(createBackupDto)


### Example

```typescript
import {
    InfoblockBackupsApi,
    Configuration,
    CreateBackupDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockBackupsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let createBackupDto: CreateBackupDto; //

const { status, data } = await apiInstance.backupsControllerCreate(
    listKey,
    createBackupDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createBackupDto** | **CreateBackupDto**|  | |
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|


### Return type

**BackupDto**

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

# **backupsControllerFile**
> { [key: string]: any; } backupsControllerFile()


### Example

```typescript
import {
    InfoblockBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockBackupsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let id: number; //Номер копии (default to undefined)

const { status, data } = await apiInstance.backupsControllerFile(
    listKey,
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **id** | [**number**] | Номер копии | defaults to undefined|


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

# **backupsControllerFindAll**
> Array<BackupDto> backupsControllerFindAll()


### Example

```typescript
import {
    InfoblockBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockBackupsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)

const { status, data } = await apiInstance.backupsControllerFindAll(
    listKey
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|


### Return type

**Array<BackupDto>**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | У списка нет резервных копий |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **backupsControllerRemove**
> backupsControllerRemove()


### Example

```typescript
import {
    InfoblockBackupsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockBackupsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let id: number; //Номер копии (default to undefined)

const { status, data } = await apiInstance.backupsControllerRemove(
    listKey,
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **id** | [**number**] | Номер копии | defaults to undefined|


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

# **backupsControllerRestore**
> BackupDto backupsControllerRestore(restoreBackupDto)


### Example

```typescript
import {
    InfoblockBackupsApi,
    Configuration,
    RestoreBackupDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockBackupsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let id: number; //Номер копии (default to undefined)
let restoreBackupDto: RestoreBackupDto; //

const { status, data } = await apiInstance.backupsControllerRestore(
    listKey,
    id,
    restoreBackupDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **restoreBackupDto** | **RestoreBackupDto**|  | |
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|
| **id** | [**number**] | Номер копии | defaults to undefined|


### Return type

**BackupDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**409** | Копия сделана не для этого списка |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **backupsControllerUpload**
> BackupDto backupsControllerUpload(uploadBackupDto)


### Example

```typescript
import {
    InfoblockBackupsApi,
    Configuration,
    UploadBackupDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockBackupsApi(configuration);

let listKey: string; //Ключ списка: вид и, у вложенных списков, номер владельца (default to undefined)
let uploadBackupDto: UploadBackupDto; //

const { status, data } = await apiInstance.backupsControllerUpload(
    listKey,
    uploadBackupDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **uploadBackupDto** | **UploadBackupDto**|  | |
| **listKey** | [**string**] | Ключ списка: вид и, у вложенных списков, номер владельца | defaults to undefined|


### Return type

**BackupDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Файл не копия или копия другого списка |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

