import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface FileCreationAttrs {
  userId: number;
  sectionId: number;
  name: string;
  objectKey: string;
  mimeType: string;
  size: number;
  description?: string | null;
}

/**
 * Файл медиатеки. Сам файл лежит в S3 (MinIO), в базе — только его карточка:
 * ключ объекта, исходное имя и описание. Изображение от прочих файлов отличается
 * лишь MIME-типом — отдельной сущности под картинки нет.
 */
@Table({
  tableName: 'files',
  indexes: [
    { fields: ['userId'] },
    { fields: ['sectionId'] },
    {
      // Ключ объекта — адрес файла в хранилище; две строки на один объект означали бы,
      // что удаление одной оставляет вторую со сломанной ссылкой.
      name: 'files_object_key',
      unique: true,
      fields: ['objectKey'],
    },
  ],
})
export class Files extends Model<Files, FileCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер файла' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец файла' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 1, description: 'Раздел медиатеки' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  sectionId: number;

  @ApiProperty({ example: 'banner-main.jpg', description: 'Имя файла при загрузке' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: '1/2026/09/9f2c1a0b-banner-main.jpg',
    description: 'Ключ объекта в хранилище; адрес для браузера строится из него',
  })
  @Column({ type: DataType.STRING, allowNull: false })
  objectKey: string;

  @ApiProperty({ example: 'image/jpeg' })
  @Column({ type: DataType.STRING, allowNull: false })
  mimeType: string;

  @ApiProperty({ example: 184320, description: 'Размер в байтах' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  size: number;

  @ApiProperty({ example: 'Баннер на главной', nullable: true })
  @Column({ type: DataType.STRING, allowNull: true })
  description: string | null;
}
