import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** Что посетитель вводит в поле — от этого зависит контрол на сайте и проверка ввода. */
export enum FormFieldType {
  Text = 'text',
  Email = 'email',
  Phone = 'phone',
  Textarea = 'textarea',
  Select = 'select',
  Checkbox = 'checkbox',
}

interface FormFieldCreationAttrs {
  userId: number;
  formId: number;
  code: string;
  label: string;
  type?: FormFieldType;
  placeholder?: string | null;
  options?: string[];
  isRequired?: boolean;
  isActive?: boolean;
  position?: number;
}

/**
 * Поле формы — один вопрос посетителю. Живёт только вместе со своей формой:
 * удаление формы уносит её поля (в транзакции, FK без каскада).
 */
@Table({
  tableName: 'form_fields',
  indexes: [
    { fields: ['userId'] },
    { fields: ['formId'] },
    {
      // Код поля — ключ значения в заявке и в письме: два одинаковых в одной
      // форме означали бы, что одно значение затирает другое.
      name: 'form_fields_form_code',
      unique: true,
      fields: ['formId', 'code'],
    },
  ],
})
export class FormFields extends Model<FormFields, FormFieldCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер поля' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец поля' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 1, description: 'Форма, которой принадлежит поле' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  formId: number;

  @ApiProperty({ example: 100, description: 'Порядок среди полей формы' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ example: 'phone', description: 'Ключ значения в заявке' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Телефон', description: 'Подпись поля на сайте' })
  @Column({ type: DataType.STRING, allowNull: false })
  label: string;

  @ApiProperty({ enum: FormFieldType, example: FormFieldType.Text })
  @Column({
    type: DataType.ENUM(...Object.values(FormFieldType)),
    allowNull: false,
    defaultValue: FormFieldType.Text,
  })
  type: FormFieldType;

  @ApiProperty({ example: '+7 (900) 000-00-00', nullable: true, description: 'Подсказка в пустом поле' })
  @Column({ type: DataType.STRING, allowNull: true })
  placeholder: string | null;

  @ApiProperty({
    example: ['Консультация', 'Заказ', 'Другое'],
    description: 'Варианты списка; у остальных типов поля пусто',
  })
  // Массив, а не отдельная таблица: у варианта нет собственных полей и
  // живёт он только вместе с полем — связывать по id было бы нечего.
  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: false, defaultValue: [] })
  options: string[];

  @ApiProperty({ example: true, description: 'Без этого поля заявку не отправить' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isRequired: boolean;

  @ApiProperty({ example: true, description: 'Неактивное поле остаётся в админке, но не показывается' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;
}
