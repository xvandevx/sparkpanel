# UpdateInfoblockSettingsDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Имя списка; не прислали — прежнее | [optional] [default to undefined]
**code** | **string** | Код списка; не прислали — прежний | [optional] [default to undefined]
**useCode** | **boolean** | Правило редактора: показывать ли у записей поле «Код» | [optional] [default to undefined]
**codeRequired** | **boolean** | Правило редактора: требовать код перед сохранением записи | [optional] [default to undefined]
**codeUnique** | **boolean** | Правило редактора: сверять код с кодами остальных записей списка | [optional] [default to undefined]
**isHistoryEnabled** | **boolean** | Вести журнал изменений. У списка, у которого журнала нет вовсе (файлы, домены), ни на что не влияет | [optional] [default to undefined]
**isDraftEnabled** | **boolean** | Сохранять правки записей черновиком. Выключить нельзя, пока в списке есть черновики; у файлов ни на что не влияет | [optional] [default to undefined]
**maxDepth** | **number** | Уровней вложенности: 1 — плоский список, больше — дерево, null — дерево без ограничения | [optional] [default to undefined]

## Example

```typescript
import { UpdateInfoblockSettingsDto } from './api';

const instance: UpdateInfoblockSettingsDto = {
    name,
    code,
    useCode,
    codeRequired,
    codeUnique,
    isHistoryEnabled,
    isDraftEnabled,
    maxDepth,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
