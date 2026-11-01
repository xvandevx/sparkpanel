# UpdateDomainDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parentId** | **number** | Домен, к которому привязан поддомен; не указан или null — это сам домен | [optional] [default to undefined]
**name** | **string** | Имя хоста; протокол и путь отбрасываются. У поддомена — только его часть: ekb, а не ekb.farkop.ru | [optional] [default to undefined]
**isActive** | **boolean** |  | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { UpdateDomainDto } from './api';

const instance: UpdateDomainDto = {
    parentId,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
