# ProductCategoryDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**parentId** | **number** | null — категория в корне | [default to undefined]
**code** | **string** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**isActive** | **boolean** |  | [default to undefined]
**sort** | **number** |  | [default to undefined]
**isBlocked** | **boolean** | К категории привязаны записи (товары) — удалить нельзя | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]
**authorId** | **number** | Кто завёл запись; null — неизвестно | [default to undefined]

## Example

```typescript
import { ProductCategoryDto } from './api';

const instance: ProductCategoryDto = {
    id,
    parentId,
    code,
    name,
    isActive,
    sort,
    isBlocked,
    createdAt,
    updatedAt,
    authorId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
