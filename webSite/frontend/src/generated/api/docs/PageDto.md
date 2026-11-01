# PageDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**parentId** | **number** | null — страница в корне сайта | [default to undefined]
**sort** | **number** | Сортировка: порядок среди соседей | [default to undefined]
**path** | **string** | Полный адрес на сайте: свойство «Адрес» по цепочке родителей; у главной — «/» | [default to undefined]
**code** | **string** | Символьный код; к адресу не относится | [default to undefined]
**name** | **string** |  | [default to undefined]
**isActive** | **boolean** |  | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]
**authorId** | **number** | Кто завёл запись; null — неизвестно | [default to undefined]

## Example

```typescript
import { PageDto } from './api';

const instance: PageDto = {
    id,
    parentId,
    sort,
    path,
    code,
    name,
    isActive,
    createdAt,
    updatedAt,
    authorId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
