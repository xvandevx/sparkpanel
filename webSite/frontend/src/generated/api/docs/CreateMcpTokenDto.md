# CreateMcpTokenDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Где стоит токен — чтобы потом знать, что отзывать | [default to undefined]
**days** | **number** | Срок действия в днях; null — без срока | [default to undefined]

## Example

```typescript
import { CreateMcpTokenDto } from './api';

const instance: CreateMcpTokenDto = {
    name,
    days,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
