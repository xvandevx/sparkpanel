import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../record-sort';

interface FormCreationAttrs {
  code: string;
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Форма обратной связи — запись списка редактора контента с ключом `forms`.
 * Своих полей у формы минимум — код, название, активность: получателя заявок,
 * текст после отправки и прочее заводят свойствами списка.
 *
 * Поля формы — не колонка и не вложенная таблица: это системное свойство «Поля»
 * (множественная привязка к списку полей форм). Одно поле подключают к скольким
 * угодно формам, а порядок полей в форме — порядок значений свойства.
 *
 * Владельца у формы нет: формы — контент сайта, общий на всех, кто им управляет,
 * как файлы и домены.
 *
 * Таблица своя, а не `forms`: в `forms` лежат формы прежней схемы (модуль
 * в `to_delete/`), и приведение схемы к этой модели стёрло бы их колонки.
 */
@Table({
  tableName: 'infoblock_forms',
  indexes: [
    // По коду форму подключают на сайте: два одинаковых — непонятно, какую выводить.
    // Индекс, а не только проверка в сервисе: два параллельных сохранения прошли бы её оба
    { name: 'infoblock_forms_code', unique: true, fields: ['code'] },
  ],
})
export class Forms extends Model<Forms, FormCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер формы' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 'feedback', description: 'Код, которым форму подключают на сайте' })
  @Column({ type: DataType.STRING, allowNull: false })
  code: string;

  @ApiProperty({ example: 'Обратная связь', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Неактивная форма остаётся в админке, но на сайт не попадает',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
