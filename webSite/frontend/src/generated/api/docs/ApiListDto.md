# ApiListDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**listKey** | **string** | Ключ списка: его запоминает ключ API | [default to undefined]
**name** | **string** |  | [default to undefined]
**group** | **string** | Раздел документации: «Сайт», «Контент», «Каталог» | [default to undefined]
**path** | **string** | Адрес методов списка от /api/v1 | [default to undefined]

## Example

```typescript
import { ApiListDto } from './api';

const instance: ApiListDto = {
    listKey,
    name,
    group,
    path,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
