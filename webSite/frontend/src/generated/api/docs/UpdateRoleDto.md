# UpdateRoleDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Название для админки | [optional] [default to undefined]
**isActive** | **boolean** | Не прислали — «да» | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { UpdateRoleDto } from './api';

const instance: UpdateRoleDto = {
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
