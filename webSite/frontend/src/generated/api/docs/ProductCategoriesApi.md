# ProductCategoriesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**productCategoriesControllerCreate**](#productcategoriescontrollercreate) | **POST** /api/infoblocks/products/categories | Завести категорию; без parentId она встанет в корень|
|[**productCategoriesControllerFindAll**](#productcategoriescontrollerfindall) | **GET** /api/infoblocks/products/categories | Категории товаров плоским списком (дерево собирает фронт)|
|[**productCategoriesControllerRemove**](#productcategoriescontrollerremove) | **DELETE** /api/infoblocks/products/categories/{id} | Удалить пустую категорию|
|[**productCategoriesControllerUpdate**](#productcategoriescontrollerupdate) | **PATCH** /api/infoblocks/products/categories/{id} | Изменить или перенести категорию; parentId: null — в корень|

# **productCategoriesControllerCreate**
> ProductCategoryDto productCategoriesControllerCreate(createProductCategoryDto)


### Example

```typescript
import {
    ProductCategoriesApi,
    Configuration,
    CreateProductCategoryDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductCategoriesApi(configuration);

let createProductCategoryDto: CreateProductCategoryDto; //

const { status, data } = await apiInstance.productCategoriesControllerCreate(
    createProductCategoryDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createProductCategoryDto** | **CreateProductCategoryDto**|  | |


### Return type

**ProductCategoryDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Глубже предела вложенности |  -  |
|**404** | Родитель не найден |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **productCategoriesControllerFindAll**
> Array<ProductCategoryDto> productCategoriesControllerFindAll()


### Example

```typescript
import {
    ProductCategoriesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductCategoriesApi(configuration);

const { status, data } = await apiInstance.productCategoriesControllerFindAll();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ProductCategoryDto>**

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

# **productCategoriesControllerRemove**
> productCategoriesControllerRemove()


### Example

```typescript
import {
    ProductCategoriesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductCategoriesApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.productCategoriesControllerRemove(
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
|**404** | Категория не найдена |  -  |
|**409** | К категории привязаны товары или в ней есть вложенные |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **productCategoriesControllerUpdate**
> ProductCategoryDto productCategoriesControllerUpdate(updateProductCategoryDto)


### Example

```typescript
import {
    ProductCategoriesApi,
    Configuration,
    UpdateProductCategoryDto
} from './api';

const configuration = new Configuration();
const apiInstance = new ProductCategoriesApi(configuration);

let id: number; // (default to undefined)
let updateProductCategoryDto: UpdateProductCategoryDto; //

const { status, data } = await apiInstance.productCategoriesControllerUpdate(
    id,
    updateProductCategoryDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateProductCategoryDto** | **UpdateProductCategoryDto**|  | |
| **id** | [**number**] |  | defaults to undefined|


### Return type

**ProductCategoryDto**

### Authorization

[JWT-auth](../README.md#JWT-auth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** |  |  -  |
|**400** | Перенос внутрь собственной ветки или глубже предела |  -  |
|**404** | Категория не найдена |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

