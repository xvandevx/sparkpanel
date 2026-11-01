# SiteBackupDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**kind** | [**SiteBackupKind**](SiteBackupKind.md) |  | [default to undefined]
**note** | **string** | У загруженной — имя файла, у остальных пусто | [default to undefined]
**tablesCount** | **number** |  | [default to undefined]
**rowsCount** | **number** |  | [default to undefined]
**size** | **number** | Размер файла копии, байт | [default to undefined]
**authorEmail** | **string** |  | [default to undefined]
**createdAt** | **string** |  | [default to undefined]

## Example

```typescript
import { SiteBackupDto } from './api';

const instance: SiteBackupDto = {
    id,
    kind,
    note,
    tablesCount,
    rowsCount,
    size,
    authorEmail,
    createdAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
