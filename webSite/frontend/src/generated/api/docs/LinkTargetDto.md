# LinkTargetDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**listKey** | **string** | Ключ списка | [default to undefined]
**recordId** | **string** | Ключ записи в списке | [default to undefined]
**parentId** | **string** | Ключ родительской записи в том же списке: выбор рисует дерево; null — верхний уровень | [default to undefined]
**name** | **string** | Название записи | [default to undefined]
**code** | **string** | Код записи | [default to undefined]
**group** | **string** | Откуда запись: группа в выборе | [default to undefined]

## Example

```typescript
import { LinkTargetDto } from './api';

const instance: LinkTargetDto = {
    listKey,
    recordId,
    parentId,
    name,
    code,
    group,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
