# McpTokenDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**tokenTail** | **string** | Последние символы токена | [default to undefined]
**userId** | **number** | Кто создал: ассистент работает с его правами | [default to undefined]
**userEmail** | **string** | null — пользователя уже нет | [default to undefined]
**expiresAt** | **string** | null — без срока | [default to undefined]
**lastUsedAt** | **string** | null — вызовов ещё не было | [default to undefined]
**createdAt** | **string** |  | [default to undefined]

## Example

```typescript
import { McpTokenDto } from './api';

const instance: McpTokenDto = {
    id,
    name,
    tokenTail,
    userId,
    userEmail,
    expiresAt,
    lastUsedAt,
    createdAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
