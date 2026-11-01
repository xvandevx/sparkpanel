import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface FormCreationAttrs {
  userId: number;
  code: string;
  name: string;
  description?: string | null;
  notifyEmail?: string;
  successMessage?: string | null;
  submitLabel?: string;
  isActive?: boolean;
  position?: number;
}

/**
 * Форма обратной связи: набор полей, которые сайт показывает посетителю, плюс
 * настройки отправки — куда уходит заявка и что посетитель видит после отправки.
 * Сами поля живут отдельной сущностью (form-field.model.ts).
 */
@Table({
  tableName: 'forms',
  indexes: [
    { fields: ['userId'] },
    {
      // Код — то, чем форму подключают на сайте. Два одинаковых кода у одного
      // пользователя означали бы, что непонятно, какую форму показывать.
      name: 'forms_user_code',
      unique: true,
      fields: ['userId', 'code'],
    },
  ],
})
export class Forms extends Model<Forms, FormCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер формы' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец формы' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 100, description: 'Порядок в списке форм' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ example: 'feedback', description: 'Код, по которому форму подключают на сайте' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Обратная связь', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: 'Ответим в течение рабочего дня',
    nullable: true,
    description: 'Пояснение под заголовком формы на сайте',
  })
  @Column({ type: DataType.TEXT, allowNull: true })
  description: string | null;

  @ApiProperty({ example: 'sales@example.com', description: 'Куда отправлять заявки; пусто — никуда' })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  notifyEmail: string;

  @ApiProperty({
    example: 'Спасибо! Мы получили заявку.',
    nullable: true,
    description: 'Что посетитель видит после отправки',
  })
  @Column({ type: DataType.TEXT, allowNull: true })
  successMessage: string | null;

  @ApiProperty({ example: 'Отправить', description: 'Подпись кнопки отправки' })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'Отправить' })
  submitLabel: string;

  @ApiProperty({ example: true, description: 'Неактивная форма не показывается на сайте' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;
}
