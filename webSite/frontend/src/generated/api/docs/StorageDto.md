# StorageDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**isActive** | **boolean** |  | [default to undefined]
**sort** | **number** |  | [default to undefined]
**filesCount** | **number** | Сколько файлов лежит в этом хранилище | [default to undefined]
**isBlocked** | **boolean** | Хранилище выбрано для новых файлов или в нём лежат файлы — удалить нельзя | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]

## Example

```typescript
import { StorageDto } from './api';

const instance: StorageDto = {
    id,
    name,
    isActive,
    sort,
    filesCount,
    isBlocked,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
