import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockCreationAttrs {
  userId: number;
  sectionId: number;
  code: string;
  name: string;
  description?: string | null;
  elementName?: string;
  isActive?: boolean;
  position?: number;
}

/**
 * Инфоблок — список однотипных записей: «Новости», «Товары», «Отзывы».
 * Сам он контента не хранит: контент лежит в его элементах
 * (см. infoblock-element.model.ts), а здесь — только описание списка.
 *
 * Инфоблок всегда внутри раздела: `sectionId` обязателен, «ничьих» списков нет.
 */
@Table({
  tableName: 'infoblocks',
  indexes: [
    { fields: ['userId'] },
    { fields: ['sectionId'] },
    {
      // Код — то, чем инфоблок подключают на странице, поэтому он уникален
      // у пользователя целиком, а не внутри раздела: иначе после переноса
      // инфоблока в соседний раздел вёрстка звала бы уже не тот список.
      name: 'infoblocks_user_code',
      unique: true,
      fields: ['userId', 'code'],
    },
  ],
})
export class Infoblocks extends Model<Infoblocks, InfoblockCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер инфоблока' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец инфоблока' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 1, description: 'Раздел, в котором лежит инфоблок' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  sectionId: number;

  @ApiProperty({ example: 100, description: 'Порядок внутри раздела' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ example: 'news', description: 'Код, по которому инфоблок подключают' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Новости компании', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: 'Выводятся на главной и в разделе «О компании»',
    nullable: true,
    description: 'Пояснение для редактора: где список используется',
  })
  @Column({ type: DataType.TEXT, allowNull: true })
  description: string | null;

  @ApiProperty({
    example: 'Новость',
    description: 'Как называется одна запись этого списка — подпись кнопки «Добавить»',
  })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'Элемент' })
  elementName: string;

  @ApiProperty({
    example: true,
    description: 'Неактивный инфоблок остаётся в админке, но на сайт не выводится',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;
}
