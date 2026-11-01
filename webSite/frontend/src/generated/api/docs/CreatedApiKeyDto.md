# CreatedApiKeyDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**keyTail** | **string** | Последние символы ключа | [default to undefined]
**lastUsedAt** | **string** | null — запросов ещё не было | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**isWritable** | **boolean** | Пишет ли ключ; читает он всегда | [default to undefined]
**writeLists** | **Array&lt;string&gt;** | Куда ключ пишет: ключи списков; null — во все списки API (или ключ только читает) | [default to undefined]
**key** | **string** | Ключ целиком; больше его не покажут | [default to undefined]

## Example

```typescript
import { CreatedApiKeyDto } from './api';

const instance: CreatedApiKeyDto = {
    id,
    name,
    keyTail,
    lastUsedAt,
    createdAt,
    isWritable,
    writeLists,
    key,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
