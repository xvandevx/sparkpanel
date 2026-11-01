# UserDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**email** | **string** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**isRoot** | **boolean** | Главный администратор | [default to undefined]
**isActive** | **boolean** |  | [default to undefined]
**isBlocked** | **boolean** | Учётную запись нельзя удалить — это главный администратор | [default to undefined]
**sort** | **number** |  | [default to undefined]
**createdAt** | **string** | Когда учётная запись заведена | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]
**passwordChangedAt** | **string** | Когда в последний раз меняли пароль | [default to undefined]

## Example

```typescript
import { UserDto } from './api';

const instance: UserDto = {
    id,
    email,
    name,
    isRoot,
    isActive,
    isBlocked,
    sort,
    createdAt,
    updatedAt,
    passwordChangedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
