# UpdatePageDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parentId** | **number** | Перенос в другого родителя; null — в корень сайта | [optional] [default to undefined]
**code** | **string** |  | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**isActive** | **boolean** |  | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { UpdatePageDto } from './api';

const instance: UpdatePageDto = {
    parentId,
    code,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
