# FileLinkDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**listKey** | **string** | Ключ списка | [default to undefined]
**listName** | **string** | Имя списка из его настроек | [default to undefined]
**recordId** | **string** | Ключ записи в списке | [default to undefined]
**recordName** | **string** | Название записи; null — список её названий не отдаёт | [default to undefined]
**propertyId** | **number** |  | [default to undefined]
**propertyName** | **string** | Свойство, значением которого выбран файл | [default to undefined]

## Example

```typescript
import { FileLinkDto } from './api';

const instance: FileLinkDto = {
    listKey,
    listName,
    recordId,
    recordName,
    propertyId,
    propertyName,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
