# SetupStatusDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**needsRoot** | **boolean** | true — главного администратора ещё нет, нужна первичная настройка | [default to undefined]
**isDevLogin** | **boolean** | true — локальный вход без пароля включён (DEV_LOGIN&#x3D;true, не production): экран входа показывает кнопку «Войти без пароля» | [default to undefined]

## Example

```typescript
import { SetupStatusDto } from './api';

const instance: SetupStatusDto = {
    needsRoot,
    isDevLogin,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
