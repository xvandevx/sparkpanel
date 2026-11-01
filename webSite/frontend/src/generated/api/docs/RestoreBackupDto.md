# RestoreBackupDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**mode** | **string** |  | [default to undefined]
**isRecords** | **boolean** | Вернуть записи и значения их свойств | [default to undefined]
**isSettings** | **boolean** | Вернуть настройки: свойства, варианты, вкладки, поля фильтра. Только при замене | [default to undefined]

## Example

```typescript
import { RestoreBackupDto } from './api';

const instance: RestoreBackupDto = {
    mode,
    isRecords,
    isSettings,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
