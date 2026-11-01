# LinkSourceDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**listKey** | **string** | Ключ списка | [default to undefined]
**id** | **number** | Номер записи, под которую заведён список (тип контента); null — у постоянных списков | [default to undefined]
**name** | **string** | Название списка в выборе | [default to undefined]
**label** | **string** | Полное имя, когда одного названия мало: у вложенного типа контента — путь | [optional] [default to undefined]
**group** | **string** | Группа в выборе: «Контент» у типов контента; null — без группы | [default to undefined]
**parentKey** | **string** | Ключ родительского источника в дереве группы; null — верхний уровень | [default to undefined]

## Example

```typescript
import { LinkSourceDto } from './api';

const instance: LinkSourceDto = {
    listKey,
    id,
    name,
    label,
    group,
    parentKey,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
