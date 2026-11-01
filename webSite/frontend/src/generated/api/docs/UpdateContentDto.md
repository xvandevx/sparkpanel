# UpdateContentDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parentId** | **number** | Родитель; не указан или null — запись встанет в корень | [optional] [default to undefined]
**code** | **string** | Символьный код — он же код списка элементов | [optional] [default to undefined]
**name** | **string** | Название — оно же имя списка элементов | [optional] [default to undefined]
**isActive** | **boolean** |  | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { UpdateContentDto } from './api';

const instance: UpdateContentDto = {
    parentId,
    code,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
