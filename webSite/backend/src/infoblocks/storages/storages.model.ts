import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../record-sort';

interface StorageCreationAttrs {
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Внешнее S3-хранилище, куда можно загружать файлы, — запись списка редактора
 * контента с ключом `storages` (показывается в настройках сайта). Встроенного
 * здесь нет: оно одно, его адрес и ключи — в env бэкенда. Какое хранилище берёт
 * новые файлы, говорит настройка `storageId` (`settings`), а у каждого файла
 * записано, куда его положили.
 *
 * Своих полей у хранилища только стандартные: подключение — адрес, бакет,
 * ключи — системные свойства списка (`system-properties.ts`), секрет из них
 * через API не отдаётся. Как и настройки, хранилища общие на сайт — владельца
 * у строки нет. Ключи лежат открытым текстом: базу с ними надо беречь так же,
 * как `.env`.
 */
@Table({ tableName: 'infoblock_storages' })
export class Storages extends Model<Storages, StorageCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 'Yandex Object Storage', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Неактивное хранилище не выбрать для новых файлов; лежащие в нём открываются',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
