# McpCallDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**tokenId** | **number** |  | [default to undefined]
**tokenName** | **string** |  | [default to undefined]
**userEmail** | **string** |  | [default to undefined]
**tool** | **string** |  | [default to undefined]
**what** | **string** |  | [default to undefined]
**detail** | **string** |  | [default to undefined]
**result** | **string** |  | [default to undefined]
**isChange** | **boolean** | Вызов менял данные | [default to undefined]
**isError** | **boolean** |  | [default to undefined]
**args** | **{ [key: string]: any; }** | С чем вызвали инструмент | [default to undefined]

## Example

```typescript
import { McpCallDto } from './api';

const instance: McpCallDto = {
    id,
    createdAt,
    tokenId,
    tokenName,
    userEmail,
    tool,
    what,
    detail,
    result,
    isChange,
    isError,
    args,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
