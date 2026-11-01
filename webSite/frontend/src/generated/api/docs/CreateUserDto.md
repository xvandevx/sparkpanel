# CreateUserDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **string** | Email, он же логин | [default to undefined]
**password** | **string** | Пароль, минимум 6 символов | [default to undefined]
**name** | **string** | Отображаемое имя | [optional] [default to undefined]
**isActive** | **boolean** | Может ли входить в панель | [optional] [default to true]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { CreateUserDto } from './api';

const instance: CreateUserDto = {
    email,
    password,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
