# FormDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**code** | **string** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**isActive** | **boolean** |  | [default to undefined]
**sort** | **number** |  | [default to undefined]
**isBlocked** | **boolean** | Форму выбрали в привязке к контенту другой записи — удалить нельзя | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]

## Example

```typescript
import { FormDto } from './api';

const instance: FormDto = {
    id,
    code,
    name,
    isActive,
    sort,
    isBlocked,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
