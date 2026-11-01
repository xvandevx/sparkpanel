import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SortField } from '../../infoblocks/record-sort';

/** Та же длина, что и при входе (`LoginDto`): иначе заведёшь пароль, которым не войти. */
export const PASSWORD_MIN_LENGTH = 6;

/** Имя длиннее — это уже не имя, а вставленный по ошибке кусок текста. */
export const USER_NAME_MAX_LENGTH = 100;

/**
 * Новая учётная запись панели.
 *
 * Роли здесь нет намеренно: `root` в системе ровно один и заводится только
 * первичной настройкой (`POST /api/auth/setup`), всё остальное — обычные
 * пользователи. Поле `role` в теле запроса означало бы, что второго root
 * можно попросить у API, — его не должно быть даже в контракте.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'editor@copanel.app', description: 'Email, он же логин' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  email: string;

  @ApiProperty({
    example: 'secret123',
    description: `Пароль, минимум ${PASSWORD_MIN_LENGTH} символов`,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Минимальная длина пароля — ${PASSWORD_MIN_LENGTH} символов`,
  })
  password: string;

  @ApiPropertyOptional({ example: 'Мария', description: 'Отображаемое имя' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(USER_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Может ли входить в панель' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @SortField()
  sort?: number;
}
