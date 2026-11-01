# InfoblockFilesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**filesControllerFindAll**](#filescontrollerfindall) | **GET** /api/infoblocks/files | Файлы раздела; без sectionId — все, с привязками к записям|
|[**filesControllerRemove**](#filescontrollerremove) | **DELETE** /api/infoblocks/files/{id} | Удалить файл: записи его забудут, объект уйдёт из хранилища|
|[**filesControllerUpdate**](#filescontrollerupdate) | **PATCH** /api/infoblocks/files/{id} | Поправить имя и описание файла|
|[**filesControllerUpload**](#filescontrollerupload) | **POST** /api/infoblocks/files/upload | Загрузить файл в раздел или в раздел свойства|

# **filesControllerFindAll**
> Array<FileDto> filesControllerFindAll()


### Example

```typescript
import {
    InfoblockFilesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockFilesApi(configuration);

let sectionId: number; //Раздел файлов (optional) (default to undefined)
let propertyId: number; //Свойство, через которое загружены файлы (optional) (default to undefined)

const { status, data } = await apiInstance.filesControllerFindAll(
    sectionId,
    propertyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **sectionId** | [**number**] | Раздел файлов | (optional) defaults to undefined|
| **propertyId** | [**number**] | Свойство, через которое загружены файлы | (optional) defaults to undefined|


### Return type

**Array<FileDto>**

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

# **filesControllerRemove**
> filesControllerRemove()


### Example

```typescript
import {
    InfoblockFilesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockFilesApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.filesControllerRemove(
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
|**404** | Файл не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **filesControllerUpdate**
> FileDto filesControllerUpdate(updateFileDto)


### Example

```typescript
import {
    InfoblockFilesApi,
    Configuration,
    UpdateFileDto
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockFilesApi(configuration);

let id: number; // (default to undefined)
let updateFileDto: UpdateFileDto; //

const { status, data } = await apiInstance.filesControllerUpdate(
    id,
    updateFileDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateFileDto** | **UpdateFileDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**FileDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**404** | Файл не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **filesControllerUpload**
> FileDto filesControllerUpload()


### Example

```typescript
import {
    InfoblockFilesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InfoblockFilesApi(configuration);

let file: File; //Файл (default to undefined)
let sectionId: number; //Раздел файлов (optional) (default to undefined)
let propertyId: number; //Свойство «Файл» или «Изображение» (optional) (default to undefined)

const { status, data } = await apiInstance.filesControllerUpload(
    file,
    sectionId,
    propertyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **file** | [**File**] | Файл | defaults to undefined|
| **sectionId** | [**number**] | Раздел файлов | (optional) defaults to undefined|
| **propertyId** | [**number**] | Свойство «Файл» или «Изображение» | (optional) defaults to undefined|


### Return type

**FileDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Файл не передан, не указано куда, хранилище не приняло |  -  |
|**404** | Раздел или свойство не найдены |  -  |
|**413** | Файл больше 20 МБ |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

