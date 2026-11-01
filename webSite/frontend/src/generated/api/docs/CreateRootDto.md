# CreateRootDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **string** | Email главного администратора | [default to undefined]
**password** | **string** | Пароль, минимум 8 символов | [default to undefined]
**name** | **string** | Имя | [optional] [default to undefined]

## Example

```typescript
import { CreateRootDto } from './api';

const instance: CreateRootDto = {
    email,
    password,
    name,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
