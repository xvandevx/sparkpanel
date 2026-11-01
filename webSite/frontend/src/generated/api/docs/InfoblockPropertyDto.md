# InfoblockPropertyDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **number** | Номер свойства: по нему его правят и удаляют | [default to undefined]
**position** | **number** | Порядок поля в карточке записи | [optional] [default to undefined]
**isBlocked** | **boolean** | Системное свойство: заводит сервер, не меняется и не удаляется | [optional] [default to undefined]
**isFilled** | **boolean** | Свойство заполнено хотя бы у одной записи: тип тогда меняется только между строкой, текстом и HTML | [optional] [default to undefined]
**code** | **string** | Ключ значения | [default to undefined]
**name** | **string** | Подпись поля в шторке записи | [default to undefined]
**hint** | **string** | Подсказка под полем в карточке записи; пусто — без подсказки | [optional] [default to undefined]
**type** | [**PropertyType**](PropertyType.md) |  | [default to undefined]
**tab** | **string** | Код вкладки карточки записи; пустая строка — вкладка «Свойства» | [default to undefined]
**required** | **boolean** | Без значения запись не сохранить | [default to undefined]
**multiple** | **boolean** | Несколько значений; можно у любого типа, кроме таблицы | [default to undefined]
**isMultiDomain** | **boolean** | Мультидоменное: значение своё на домен — общее для всех и свои у отдельных доменов и поддоменов | [default to undefined]
**isHidden** | **boolean** | Значение не отдаётся через API: его пишут, но не читают — для паролей и ключей | [default to undefined]
**isExternal** | **boolean** | Заполняется из внешнего источника: в панели значение не правится, его пишет внешняя система через MCP | [default to undefined]
**_options** | [**Array&lt;PropertyOptionDto&gt;**](PropertyOptionDto.md) | Варианты для типа «Список»; у остальных типов пусто | [default to undefined]
**formats** | **Array&lt;string&gt;** | Допустимые форматы файла или изображения; пусто — любые | [default to undefined]
**maxSizeMb** | **number** | Наибольший вес файла, МБ | [default to undefined]
**maxWidth** | **number** | Наибольшая ширина изображения, px | [default to undefined]
**maxHeight** | **number** | Наибольшая высота изображения, px | [default to undefined]
**columns** | **number** | Столбцов в таблице; строк в записи сколько угодно | [default to undefined]
**headers** | **Array&lt;string&gt;** | Заголовки столбцов таблицы; пусто — таблица без шапки | [default to undefined]
**linkList** | **string** | Список-источник привязки к записям контента; обязателен | [default to undefined]
**optionsPropertyId** | **number** | Привязка к значениям списка: свойство-«Список», варианты которого выбирают | [default to undefined]

## Example

```typescript
import { InfoblockPropertyDto } from './api';

const instance: InfoblockPropertyDto = {
    id,
    position,
    isBlocked,
    isFilled,
    code,
    name,
    hint,
    type,
    tab,
    required,
    multiple,
    isMultiDomain,
    isHidden,
    isExternal,
    _options,
    formats,
    maxSizeMb,
    maxWidth,
    maxHeight,
    columns,
    headers,
    linkList,
    optionsPropertyId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
