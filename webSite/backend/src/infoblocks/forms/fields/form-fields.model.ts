import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../../record-sort';

interface FormFieldCreationAttrs {
  code: string;
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Поле формы обратной связи — запись списка редактора контента с ключом
 * `form-fields`. Своего у поля только стандартное — код, название, активность:
 * плейсхолдер — системное свойство списка, а тип, обязательность и прочее
 * заводят свойствами в «Настройках списка».
 *
 * Форме поле не принадлежит: формы подключают поля системным свойством «Поля»,
 * поэтому одно поле («Телефон») живёт в скольких угодно формах, а кто его
 * подключил, лежит в значениях свойств. Владельца у поля нет — как и формы,
 * поля общие на сайт.
 */
@Table({
  tableName: 'infoblock_forms_fields',
  indexes: [
    // Код поля — имя значения в заявке. Поле подключают к разным формам, и два
    // одинаковых кода в одной форме перепутали бы ответы — поэтому код
    // не повторяется вовсе
    { name: 'infoblock_forms_fields_code', unique: true, fields: ['code'] },
  ],
})
export class FormFields extends Model<FormFields, FormFieldCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер поля' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 'phone', description: 'Имя значения в заявке и в письме' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Телефон', description: 'Подпись поля на сайте' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({ example: true, description: 'Неактивное поле не показывается ни в одной форме' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
