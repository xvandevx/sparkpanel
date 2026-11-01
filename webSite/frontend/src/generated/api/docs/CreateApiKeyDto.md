# CreateApiKeyDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Для кого ключ — чтобы потом знать, что отзывать | [default to undefined]
**isWritable** | **boolean** | Право записи; по умолчанию — только чтение | [optional] [default to undefined]
**writeLists** | **Array&lt;string&gt;** | Куда ключ пишет — ключи списков из &#x60;GET /external-api/lists&#x60;; null или не прислали — во все | [optional] [default to undefined]

## Example

```typescript
import { CreateApiKeyDto } from './api';

const instance: CreateApiKeyDto = {
    name,
    isWritable,
    writeLists,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
