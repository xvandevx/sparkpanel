# FileSectionDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Номер раздела, раздела свойства (&#x60;property-…&#x60;) или группы (&#x60;group-…&#x60;) | [default to undefined]
**parentId** | **string** | null — раздел в корне | [default to undefined]
**name** | **string** |  | [default to undefined]
**sort** | **number** |  | [default to undefined]
**isBlocked** | **boolean** | Не удаляется: раздел свойства или группа — их собирает сервер | [default to undefined]
**isReadOnly** | **boolean** | Раздел свойства или группа: собраны сервером по файлам, в базе их нет — карточки и правки нет | [default to undefined]
**isGroup** | **boolean** | Группа разделов свойств одного списка, в названии — путь до списка: файлов в ней нет, перехода тоже | [default to undefined]
**propertyId** | **number** | Свойство раздела свойства: выбор файла в карточке открывается на нём | [default to undefined]
**filesCount** | **number** | Файлов в самом разделе, без вложенных | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]
**authorId** | **number** | Кто завёл запись; null — неизвестно | [default to undefined]

## Example

```typescript
import { FileSectionDto } from './api';

const instance: FileSectionDto = {
    id,
    parentId,
    name,
    sort,
    isBlocked,
    isReadOnly,
    isGroup,
    propertyId,
    filesCount,
    createdAt,
    updatedAt,
    authorId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
