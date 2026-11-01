# RecordDraftDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**recordId** | **string** | Ключ записи в списке | [default to undefined]
**fields** | **{ [key: string]: any; }** | Изменённые поля записи — как их принимает PATCH раздела | [default to undefined]
**values** | [**Array&lt;PropertyValueDto&gt;**](PropertyValueDto.md) | Изменённые свойства записи | [default to undefined]
**isNew** | **boolean** | Запись заведена черновиком и на сайте её ещё нет | [default to undefined]
**authorEmail** | **string** | Кто сохранил черновик последним | [default to undefined]
**updatedAt** | **string** | Когда черновик сохранили последний раз | [default to undefined]

## Example

```typescript
import { RecordDraftDto } from './api';

const instance: RecordDraftDto = {
    recordId,
    fields,
    values,
    isNew,
    authorEmail,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
