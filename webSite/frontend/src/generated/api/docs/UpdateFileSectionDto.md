# UpdateFileSectionDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parentId** | **number** | Новый родитель; null — корень | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { UpdateFileSectionDto } from './api';

const instance: UpdateFileSectionDto = {
    parentId,
    name,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
