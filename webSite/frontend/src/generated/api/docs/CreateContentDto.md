# CreateContentDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parentId** | **number** | Родитель; не указан или null — запись встанет в корень | [optional] [default to undefined]
**code** | **string** | Символьный код — он же код списка элементов | [default to undefined]
**name** | **string** | Название — оно же имя списка элементов | [default to undefined]
**isActive** | **boolean** |  | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { CreateContentDto } from './api';

const instance: CreateContentDto = {
    parentId,
    code,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
