# SaveRecordDraftDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**fields** | **{ [key: string]: any; }** | Изменённые поля записи — как их принимает PATCH раздела | [default to undefined]
**values** | [**Array&lt;PropertyValueDto&gt;**](PropertyValueDto.md) |  | [default to undefined]
**isNew** | **boolean** | Запись только что заведена черновиком: на сайте её нет до публикации. Учитывается, только когда черновика у записи ещё не было | [optional] [default to undefined]

## Example

```typescript
import { SaveRecordDraftDto } from './api';

const instance: SaveRecordDraftDto = {
    fields,
    values,
    isNew,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
