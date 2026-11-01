import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../record-sort';

interface RoleCreationAttrs {
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Роль пользователя панели — запись списка редактора контента с ключом `roles`.
 * Пользователю её назначают системным свойством «Роль» (привязка к контенту),
 * поэтому своей связи с `users` у роли нет: кто в роли, лежит в значениях свойств.
 *
 * Владельца у роли нет: роли, как и учётные записи, общие на всю панель.
 * Своих полей у роли только стандартные — название, активность, сортировка;
 * кода у роли нет: назначают её по номеру. Описание и прочее заводят свойствами
 * списка.
 */
@Table({ tableName: 'infoblock_roles' })
export class Roles extends Model<Roles, RoleCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер роли' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 'Редактор', description: 'Название для админки' })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Неактивная роль остаётся в панели и у пользователей, но прав не даёт',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
