# UpdateFormDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **string** | Код, которым форму подключают на сайте | [optional] [default to undefined]
**name** | **string** | Название для админки | [optional] [default to undefined]
**isActive** | **boolean** |  | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { UpdateFormDto } from './api';

const instance: UpdateFormDto = {
    code,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
