# CreateFormDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **string** | Код, которым форму подключают на сайте | [default to undefined]
**name** | **string** | Название для админки | [default to undefined]
**isActive** | **boolean** |  | [optional] [default to undefined]
**sort** | **number** | Сортировка; не прислали — 500 или прежняя | [optional] [default to undefined]

## Example

```typescript
import { CreateFormDto } from './api';

const instance: CreateFormDto = {
    code,
    name,
    isActive,
    sort,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
