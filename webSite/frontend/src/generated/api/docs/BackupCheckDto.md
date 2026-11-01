# BackupCheckDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**records** | [**BackupCountsDto**](BackupCountsDto.md) |  | [default to undefined]
**properties** | [**BackupCountsDto**](BackupCountsDto.md) |  | [default to undefined]
**removedRecords** | **number** | Есть сейчас, в копии нет: при замене удалятся | [default to undefined]
**keptRecords** | **number** | Есть сейчас, в копии нет, но защищены — останутся | [default to undefined]
**returnedRecords** | **number** | Есть в копии, сейчас нет: вернутся | [default to undefined]
**changedRecords** | **number** | Есть и там, и там, но отличаются | [default to undefined]
**removedProperties** | **Array&lt;string&gt;** | Свойства, которых в копии нет: при замене настроек удалятся со значениями | [default to undefined]
**missingFiles** | **number** | Значения «Файл»/«Изображение» из копии на удалённые файлы | [default to undefined]

## Example

```typescript
import { BackupCheckDto } from './api';

const instance: BackupCheckDto = {
    records,
    properties,
    removedRecords,
    keptRecords,
    returnedRecords,
    changedRecords,
    removedProperties,
    missingFiles,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
