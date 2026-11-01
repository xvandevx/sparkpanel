/** Вид списка файлов, загруженных через свойство: `property-files.<номер свойства>`. */
export const PROPERTY_FILES_KIND = 'property-files';

/**
 * Список, записью которого числится файл: раздела (`files.10`) или свойства,
 * через которое его загрузили (`property-files.6`). По нему лежат значения
 * свойств самого файла.
 */
export const fileListKey = (file: { sectionId: number | null; propertyId: number | null }): string =>
  file.sectionId !== null ? `files.${file.sectionId}` : `${PROPERTY_FILES_KIND}.${file.propertyId}`;
