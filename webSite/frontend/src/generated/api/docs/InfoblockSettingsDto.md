# InfoblockSettingsDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**listKey** | **string** |  | [default to undefined]
**name** | **string** | Имя списка | [default to undefined]
**code** | **string** | Код списка | [default to undefined]
**useCode** | **boolean** | Правило редактора: показывать ли у записей поле «Код». Сервер его не проверяет | [default to undefined]
**codeRequired** | **boolean** | Правило редактора: требовать код перед сохранением записи | [default to undefined]
**codeUnique** | **boolean** | Правило редактора: сверять код с кодами остальных записей списка | [default to undefined]
**hasJournal** | **boolean** | У списка есть журнал изменений: правки его записей пишутся в историю | [default to undefined]
**isHistoryEnabled** | **boolean** | Журнал ведётся: правки записей пишутся в историю, и редактор её показывает. Всегда false у списка без журнала | [default to undefined]
**hasDrafts** | **boolean** | Записям списка бывают черновики: у файлов их нет, у остальных включаются галочкой | [default to undefined]
**isDraftEnabled** | **boolean** | Черновики включены: правки сохраняются черновиком и попадают в записи по «Опубликовать». Всегда false у списка без черновиков | [default to undefined]
**maxDepth** | **number** | Уровней вложенности; он же решает, дерево ли список: 1 — плоский, больше — дерево, null — дерево без ограничения | [default to undefined]

## Example

```typescript
import { InfoblockSettingsDto } from './api';

const instance: InfoblockSettingsDto = {
    listKey,
    name,
    code,
    useCode,
    codeRequired,
    codeUnique,
    hasJournal,
    isHistoryEnabled,
    hasDrafts,
    isDraftEnabled,
    maxDepth,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
