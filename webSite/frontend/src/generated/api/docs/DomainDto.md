# DomainDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** |  | [default to undefined]
**parentId** | **number** | null — домен, иначе поддомен этого домена | [default to undefined]
**name** | **string** | Имя: у домена — целиком, у поддомена — его часть | [default to undefined]
**address** | **string** | Полный адрес: у поддомена — вместе с именем домена. Не хранится, складывается | [default to undefined]
**isActive** | **boolean** |  | [default to undefined]
**sort** | **number** |  | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]

## Example

```typescript
import { DomainDto } from './api';

const instance: DomainDto = {
    id,
    parentId,
    name,
    address,
    isActive,
    sort,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
