# UpdatePropertyValuesDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**values** | [**Array&lt;PropertyValueDto&gt;**](PropertyValueDto.md) |  | [default to undefined]
**parentId** | **string** | Родитель записи в дереве списка. Нужен только спискам, у которых дерева нет в своей таблице: у страниц родитель уходит в их собственный запрос, и сюда его не присылают. Не прислали — остаётся прежним | [optional] [default to undefined]
**externalId** | **string** | Внешний ID записи — номер в системе-источнике, уникален в списке; пустой или null — стереть. Задаёт только интеграция (внешнее API, MCP): из панели — 400. Не прислали — остаётся прежним | [optional] [default to undefined]

## Example

```typescript
import { UpdatePropertyValuesDto } from './api';

const instance: UpdatePropertyValuesDto = {
    values,
    parentId,
    externalId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
