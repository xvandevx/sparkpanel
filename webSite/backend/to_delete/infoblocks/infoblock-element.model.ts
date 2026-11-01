import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockElementCreationAttrs {
  userId: number;
  infoblockId: number;
  code: string;
  name: string;
  preview?: string | null;
  content?: string | null;
  image?: string | null;
  date?: string | null;
  isActive?: boolean;
  position?: number;
  props?: Record<string, unknown>;
}

/**
 * Элемент инфоблока — одна запись списка: «Новость 1», «Новость 2».
 * Живёт только вместе со своим инфоблоком: удаление инфоблока уносит элементы
 * (в транзакции, FK без каскада).
 *
 * Набор полей пока общий на все инфоблоки. Свои свойства у каждого списка
 * (цена, артикул) появятся позже и лягут в `props` — поле заведено сразу,
 * чтобы добавление свойств не заставляло переделывать таблицу задним числом.
 */
@Table({
  tableName: 'infoblock_elements',
  indexes: [
    { fields: ['userId'] },
    { fields: ['infoblockId'] },
    {
      // Код элемента — сегмент его адреса на сайте: два одинаковых в одном
      // списке дали бы две записи по одному адресу.
      name: 'infoblock_elements_block_code',
      unique: true,
      fields: ['infoblockId', 'code'],
    },
  ],
})
export class InfoblockElements extends Model<InfoblockElements, InfoblockElementCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер элемента' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец элемента' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 1, description: 'Инфоблок, которому принадлежит элемент' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  infoblockId: number;

  @ApiProperty({ example: 100, description: 'Порядок внутри инфоблока' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ example: 'otkrytie-ofisa', description: 'Сегмент адреса элемента' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Открытие нового офиса' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: 'Коротко о главном',
    nullable: true,
    description: 'Анонс: то, что видно в списке на сайте',
  })
  @Column({ type: DataType.TEXT, allowNull: true })
  preview: string | null;

  @ApiProperty({ example: '<p>Полный текст</p>', nullable: true, description: 'Текст элемента' })
  @Column({ type: DataType.TEXT, allowNull: true })
  content: string | null;

  @ApiProperty({
    example: '/files/1/2026/09/banner.jpg',
    nullable: true,
    description: 'Адрес картинки элемента',
  })
  // TEXT, а не STRING: STRING это VARCHAR(255), а ключ файла в медиатеке
  // складывается из владельца, года, месяца и исходного имени — в 255 он
  // помещается не всегда, и запрос падал бы ошибкой сервера
  @Column({ type: DataType.TEXT, allowNull: true })
  image: string | null;

  @ApiProperty({
    example: '2026-09-16',
    nullable: true,
    description: 'Дата элемента: по ней сортируют новости и показывают её в списке',
  })
  @Column({ type: DataType.DATEONLY, allowNull: true })
  date: string | null;

  @ApiProperty({ example: true, description: 'Неактивный элемент на сайт не выводится' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({
    type: 'object',
    example: {},
    description: 'Произвольные свойства элемента; задел под настраиваемые поля инфоблока',
  })
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  props: Record<string, unknown>;
}
