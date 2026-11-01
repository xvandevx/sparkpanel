# RecordsPageDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**items** | **Array&lt;{ [key: string]: any; }&gt;** | Записи страницы; у дерева — записи верхнего уровня, за каждой её ветка | [default to undefined]
**total** | **number** | Сколько всего: у дерева — записей верхнего уровня, иначе — записей | [default to undefined]
**values** | [**Array&lt;RecordValuesDto&gt;**](RecordValuesDto.md) | Значения свойств записей страницы; запись без значений не перечислена | [default to undefined]
**drafts** | [**Array&lt;RecordDraftDto&gt;**](RecordDraftDto.md) | Черновики записей страницы; запись без черновика не перечислена. Записи и значения выше — опубликованные: черновик накладывает карточка, а ищет и сортирует сервер уже с ним | [default to undefined]
**draftsCount** | **number** | Черновиков во всём списке — для вида «Черновики» | [default to undefined]

## Example

```typescript
import { RecordsPageDto } from './api';

const instance: RecordsPageDto = {
    items,
    total,
    values,
    drafts,
    draftsCount,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
