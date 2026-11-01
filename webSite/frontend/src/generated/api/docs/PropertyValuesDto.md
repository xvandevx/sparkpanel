# PropertyValuesDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**recordId** | **string** | Ключ записи в списке | [default to undefined]
**values** | [**Array&lt;PropertyValueDto&gt;**](PropertyValueDto.md) | Заполненные свойства записи | [default to undefined]
**parentId** | **string** | Родитель в дереве списка; null — запись в корне или список не древовидный | [default to undefined]

## Example

```typescript
import { PropertyValuesDto } from './api';

const instance: PropertyValuesDto = {
    recordId,
    values,
    parentId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
