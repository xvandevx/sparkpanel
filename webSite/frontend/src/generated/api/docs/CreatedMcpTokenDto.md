# CreatedMcpTokenDto


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
**token** | **string** | Токен целиком; больше его не покажут | [default to undefined]

## Example

```typescript
import { CreatedMcpTokenDto } from './api';

const instance: CreatedMcpTokenDto = {
    id,
    name,
    tokenTail,
    userId,
    userEmail,
    expiresAt,
    lastUsedAt,
    createdAt,
    token,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
