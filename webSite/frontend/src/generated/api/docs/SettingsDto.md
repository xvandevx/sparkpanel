# SettingsDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**siteName** | **string** | Название сайта | [default to undefined]
**storageId** | **number** | Хранилище для новых файлов; null — встроенное | [default to undefined]
**logoUrl** | **string** | Адрес логотипа панели; пусто — логотип SparkPanel | [default to undefined]

## Example

```typescript
import { SettingsDto } from './api';

const instance: SettingsDto = {
    siteName,
    storageId,
    logoUrl,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
