import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface PropertyOptionCreationAttrs {
  propertyId: number;
  code: string;
  name: string;
  position: number;
}

/**
 * Вариант свойства типа «Список» — строка на вариант. Значение записи хранит
 * номер варианта, код уходит на сайт, название видит редактор в карточке.
 *
 * Своя таблица, а не массив внутри свойства: по вариантам нужно будет искать
 * и фильтровать записи, а у варианта должен быть устойчивый номер.
 *
 * Владельца у варианта нет: он у свойства. Варианты всегда читаются по номерам
 * свойств, а те уже отобраны по `userId` и ключу списка — второй раз изоляцию
 * проверять негде и незачем.
 */
@Table({
  tableName: 'infoblock_settings_property_options',
  indexes: [
    // Код варианта уникален внутри свойства: по нему сайт узнаёт вариант
    {
      name: 'infoblock_settings_property_options_code',
      unique: true,
      fields: ['propertyId', 'code'],
    },
  ],
})
export class InfoblockPropertyOption extends Model<
  InfoblockPropertyOption,
  PropertyOptionCreationAttrs
> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 4, description: 'Свойство, которому принадлежит вариант' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  propertyId: number;

  @ApiProperty({ example: 'new', description: 'Ключ варианта на сайте' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Новинка', description: 'Название варианта в карточке записи' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({ example: 100, description: 'Порядок варианта в выборе' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;
}
