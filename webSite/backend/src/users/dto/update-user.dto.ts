import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH, USER_NAME_MAX_LENGTH } from './create-user.dto';
import { SortField } from '../../infoblocks/record-sort';

/**
 * Правка учётной записи. Все поля необязательны — присылается только изменённое.
 *
 * `password` отсутствует в теле = пароль не трогаем. Пустую строку сюда слать
 * нельзя: это была бы попытка «сохранить пустой пароль», и валидация её отвергнет.
 * Роль не меняется никогда — см. `CreateUserDto`.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'editor@copanel.app' })
  @IsOptional()
  @IsEmail({}, { message: 'Некорректный формат email' })
  email?: string;

  @ApiPropertyOptional({
    example: 'new-secret123',
    description: `Новый пароль, минимум ${PASSWORD_MIN_LENGTH} символов; не прислан — пароль прежний`,
  })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Минимальная длина пароля — ${PASSWORD_MIN_LENGTH} символов`,
  })
  password?: string;

  @ApiPropertyOptional({ example: 'Мария' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(USER_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ example: false, description: 'Отключённый не может войти' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @SortField()
  sort?: number;
}
