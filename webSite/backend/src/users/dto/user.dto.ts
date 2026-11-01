import { ApiProperty } from '@nestjs/swagger';
import { Users } from '../users.model';

/** Даты наружу отдаются строкой ISO: клиенту нужен один предсказуемый формат. */
const toIso = (value: Date | string): string => new Date(value).toISOString();

/**
 * Публичное представление пользователя. Существует отдельно от модели,
 * чтобы passwordHash физически не мог попасть в ответ.
 */
export class UserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'root@copanel.app' })
  email: string;

  @ApiProperty({ example: 'Иван', nullable: true })
  name: string | null;

  @ApiProperty({ example: true, description: 'Главный администратор' })
  isRoot: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({
    example: false,
    description: 'Учётную запись нельзя удалить — это главный администратор',
  })
  isBlocked: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z', description: 'Когда учётная запись заведена' })
  createdAt: string;


  @ApiProperty({ example: '2026-09-16T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  @ApiProperty({
    example: '2026-09-16T10:00:00.000Z',
    nullable: true,
    description: 'Когда в последний раз меняли пароль',
  })
  passwordChangedAt: string | null;

  static from(user: Users): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      isRoot: user.isRoot,
      isActive: user.isActive,
      isBlocked: user.isRoot,
      sort: user.sort,
      createdAt: toIso(user.createdAt),
      updatedAt: toIso(user.updatedAt),
      passwordChangedAt: user.passwordChangedAt ? toIso(user.passwordChangedAt) : null,
    };
  }
}
