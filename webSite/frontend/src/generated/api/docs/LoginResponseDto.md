# LoginResponseDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**token** | **string** | JWT для заголовка Authorization: Bearer &lt;token&gt; | [default to undefined]
**user** | [**UserDto**](UserDto.md) |  | [default to undefined]

## Example

```typescript
import { LoginResponseDto } from './api';

const instance: LoginResponseDto = {
    token,
    user,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
