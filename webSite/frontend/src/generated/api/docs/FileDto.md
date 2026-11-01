# FileDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** | Порядковый номер файла | [default to undefined]
**sectionId** | **number** | Раздел файлов; null — загружен через свойство | [default to undefined]
**propertyId** | **number** | Свойство, через которое загружен файл; null — файл в разделе | [default to undefined]
**name** | **string** | Имя файла | [default to undefined]
**code** | **string** | Код файла — имя в адресе, латиницей, с расширением; адрес — папки из номера плюс код | [default to undefined]
**url** | **string** | Адрес файла — собран из ключа объекта и хранилища; у встроенного относительный, отдаёт сама панель | [default to undefined]
**mimeType** | **string** |  | [default to undefined]
**isImage** | **boolean** | Файл — изображение (по MIME-типу) | [default to undefined]
**size** | **number** | Размер в байтах | [default to undefined]
**storageId** | **number** | Хранилище; null — встроенное | [default to undefined]
**storageName** | **string** | Название хранилища, где лежит файл: «Встроенное» или имя внешнего | [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** | Когда запись или значения её свойств правили последний раз | [default to undefined]
**links** | [**Array&lt;FileLinkDto&gt;**](FileLinkDto.md) | Записи, выбравшие файл своим свойством | [default to undefined]

## Example

```typescript
import { FileDto } from './api';

const instance: FileDto = {
    id,
    sectionId,
    propertyId,
    name,
    code,
    url,
    mimeType,
    isImage,
    size,
    storageId,
    storageName,
    createdAt,
    updatedAt,
    links,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
