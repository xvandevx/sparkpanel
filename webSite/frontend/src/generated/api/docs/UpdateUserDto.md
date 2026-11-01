# UpdateUserDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **string** |  | [optional] [default to undefined]
**password** | **string** | Новый пароль, минимум 6 символов; не прислан — пароль прежний | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**isActive** | **boolean** | Отключённый не может войти | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { UpdateUserDto } from './api';

const instance: UpdateUserDto = {
    email,
    password,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
