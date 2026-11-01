# McpApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**mcpPanelControllerCreateToken**](#mcppanelcontrollercreatetoken) | **POST** /api/mcp/tokens | Создать токен себе. Ответ — единственный раз, когда токен виден целиком|
|[**mcpPanelControllerFindCalls**](#mcppanelcontrollerfindcalls) | **GET** /api/mcp/calls | Журнал вызовов MCP за 30 дней, новые сверху|
|[**mcpPanelControllerFindTokens**](#mcppanelcontrollerfindtokens) | **GET** /api/mcp/tokens | Токены MCP, новые сверху: у root — все, у остальных — свои|
|[**mcpPanelControllerRemoveToken**](#mcppanelcontrollerremovetoken) | **DELETE** /api/mcp/tokens/{id} | Отозвать токен — ассистент с ним сразу теряет доступ|

# **mcpPanelControllerCreateToken**
> CreatedMcpTokenDto mcpPanelControllerCreateToken(createMcpTokenDto)


### Example

```typescript
import {
    McpApi,
    Configuration,
    CreateMcpTokenDto
} from './api';

const configuration = new Configuration();
const apiInstance = new McpApi(configuration);

let createMcpTokenDto: CreateMcpTokenDto; //

const { status, data } = await apiInstance.mcpPanelControllerCreateToken(
    createMcpTokenDto
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createMcpTokenDto** | **CreateMcpTokenDto**|  | |


### Return type

**CreatedMcpTokenDto**

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

# **mcpPanelControllerFindCalls**
> McpCallsPageDto mcpPanelControllerFindCalls()


### Example

```typescript
import {
    McpApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new McpApi(configuration);

let tokenId: number; //Только вызовы этого токена (optional) (default to undefined)
let tool: string; // (optional) (default to undefined)
let view: 'all' | 'changes' | 'errors'; // (optional) (default to undefined)
let page: number; // (optional) (default to undefined)
let pageSize: 20 | 50 | 100; // (optional) (default to undefined)

const { status, data } = await apiInstance.mcpPanelControllerFindCalls(
    tokenId,
    tool,
    view,
    page,
    pageSize
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **tokenId** | [**number**] | Только вызовы этого токена | (optional) defaults to undefined|
| **tool** | [**string**] |  | (optional) defaults to undefined|
| **view** | [**&#39;all&#39; | &#39;changes&#39; | &#39;errors&#39;**]**Array<&#39;all&#39; &#124; &#39;changes&#39; &#124; &#39;errors&#39;>** |  | (optional) defaults to undefined|
| **page** | [**number**] |  | (optional) defaults to undefined|
| **pageSize** | [**20 | 50 | 100**]**Array<20 &#124; 50 &#124; 100>** |  | (optional) defaults to undefined|


### Return type

**McpCallsPageDto**

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

# **mcpPanelControllerFindTokens**
> Array<McpTokenDto> mcpPanelControllerFindTokens()


### Example

```typescript
import {
    McpApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new McpApi(configuration);

const { status, data } = await apiInstance.mcpPanelControllerFindTokens();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<McpTokenDto>**

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

# **mcpPanelControllerRemoveToken**
> mcpPanelControllerRemoveToken()


### Example

```typescript
import {
    McpApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new McpApi(configuration);

let id: number; // (default to undefined)

const { status, data } = await apiInstance.mcpPanelControllerRemoveToken(
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
|**403** | Чужой токен, а вы не root |  -  |
|**404** | Токена нет |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

