import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../infoblocks/record-sort';

interface UserCreationAttrs {
  email: string;
  passwordHash: string;
  name?: string;
  isRoot?: boolean;
  sort?: number;
  isActive?: boolean;
  passwordChangedAt?: Date;
}

@Table({
  tableName: 'users',
  indexes: [
    { fields: ['email'], unique: true },
    {
      // Частичный уникальный индекс: главный администратор может быть максимум один.
      // Проверки «а root уже есть?» в сервисе недостаточно — между SELECT и INSERT
      // успевает пролезть параллельный запрос, а первичная настройка открыта без авторизации.
      name: 'users_single_root',
      unique: true,
      fields: ['isRoot'],
      where: { isRoot: true },
    },
  ],
})
export class Users extends Model<Users, UserCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Идентификатор пользователя' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 'root@copanel.app', description: 'Email (он же логин)' })
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email: string;

  // Наружу не отдаётся никогда: ответы собираются через UserDto.
  @ApiHideProperty()
  @Column({ type: DataType.STRING, allowNull: false })
  passwordHash: string;

  @ApiProperty({ example: 'Иван', description: 'Отображаемое имя', required: false })
  @Column({ type: DataType.STRING, allowNull: true })
  name: string | null;

  /**
   * Главный администратор: правит пользователей, роли и настройки списков панели.
   * Он ровно один — это гарантирует индекс выше. Права остальных — роль
   * из справочника, системное свойство «Роль» списка `users`
   */
  @ApiProperty({ example: true, description: 'Главный администратор' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isRoot: boolean;

  @ApiProperty({ example: true, description: 'Активен ли аккаунт' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;

  /**
   * Когда пароль меняли в последний раз. Сам пароль в журнал изменений не пишется
   * никогда, а факт смены — обязан быть виден: сравнивать нечего, кроме этой даты.
   */
  @ApiProperty({ example: '2026-09-16T10:00:00.000Z', description: 'Дата последней смены пароля' })
  @Column({ type: DataType.DATE, allowNull: true })
  passwordChangedAt: Date | null;
}
