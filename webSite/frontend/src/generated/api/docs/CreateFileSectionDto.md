# CreateFileSectionDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**parentId** | **number** | Родитель; не указан или null — раздел встанет в корень | [optional] [default to undefined]
**name** | **string** | Название для админки | [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { CreateFileSectionDto } from './api';

const instance: CreateFileSectionDto = {
    parentId,
    name,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
