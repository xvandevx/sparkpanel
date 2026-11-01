import { ApiProperty } from '@nestjs/swagger';
import { Roles } from '../roles.model';

/** Роль в том виде, в каком её показывает админка. */
export class RoleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Редактор' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({
    example: false,
    description: 'Роль назначена хотя бы одной записи — удалить нельзя',
  })
  isBlocked: boolean;

  @ApiProperty({ example: '2026-10-12T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-12T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  static from(role: Roles, isLinked: boolean): RoleDto {
    return {
      id: role.id,
      name: role.name,
      isActive: role.isActive,
      sort: role.sort,
      isBlocked: isLinked,
      createdAt: toIso(role.createdAt),
      updatedAt: toIso(role.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
