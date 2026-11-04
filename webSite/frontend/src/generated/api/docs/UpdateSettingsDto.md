# UpdateSettingsDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**siteName** | **string** | Название сайта | [optional] [default to undefined]
**storageId** | **number** | Хранилище для новых файлов; null — встроенное | [optional] [default to undefined]
**logo** | **string** | Логотип панели картинкой data URI: PNG, JPEG, WebP, GIF или SVG до 512 КБ; null — вернуть логотип SparkPanel | [optional] [default to undefined]

## Example

```typescript
import { UpdateSettingsDto } from './api';

const instance: UpdateSettingsDto = {
    siteName,
    storageId,
    logo,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
