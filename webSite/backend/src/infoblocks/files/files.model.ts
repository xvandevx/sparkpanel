import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface FileCreationAttrs {
  sectionId: number | null;
  propertyId: number | null;
  name: string;
  code: string;
  mimeType: string;
  size: number;
  storageId: number | null;
}

/**
 * Файл — запись списка редактора контента: `files.<номер раздела>`, а загруженный
 * через свойство — `property-files.<номер свойства>`. Лежит файл ровно в одном
 * месте: в разделе (`sectionId`) или у свойства «Файл»/«Изображение»
 * (`propertyId`), — разделов под свойства в базе нет, «Файлы» показывают их
 * по `propertyId` файлов. Сам файл
 * лежит в S3 — встроенном или внешнем, в базе его карточка: имя, код, тип, размер.
 * Ключа объекта в базе нет — он собирается из номера и кода (`objectKeyOf`).
 * Изображение от прочих файлов отличается лишь MIME-типом.
 *
 * Владельца у файла нет: файлы общие на сайт, как и хранилища. Адреса в базе
 * тоже нет — он собирается из ключа и хранилища (`StorageService.url`):
 * храни его рядом с ключом, и сменённый публичный адрес хранилища разошёлся бы
 * с адресами уже загруженных файлов.
 *
 * К каким записям привязан файл, здесь не хранится: привязка — это значение
 * свойства «Файл» или «Изображение» у записи. Её читает `FileLinksService`.
 */
@Table({
  tableName: 'infoblock_files',
  indexes: [
    { fields: ['sectionId'] },
    { fields: ['propertyId'] },
  ],
})
export class Files extends Model<Files, FileCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер файла' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({
    example: 1,
    nullable: true,
    description: 'Раздел файлов (`infoblock_files_sections`); null — файл загружен через свойство',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  sectionId: number | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Свойство «Файл»/«Изображение», через которое загружен файл; null — файл в разделе',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  propertyId: number | null;

  @ApiProperty({ example: 'banner-main.jpg', description: 'Имя файла; при загрузке — имя на диске' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: 'banner-main.jpg',
    description: 'Код файла — имя в адресе: латиницей, с расширением; после загрузки не меняется',
  })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'image/jpeg' })
  @Column({ type: DataType.STRING, allowNull: false })
  mimeType: string;

  @ApiProperty({ example: 184320, description: 'Размер в байтах' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  size: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Хранилище, куда файл загружен (`infoblock_storages`); null — встроенное',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  storageId: number | null;
}
