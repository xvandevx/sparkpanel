import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Минимальная длина пароля root-пользователя: это доступ ко всей панели. */
export const ROOT_PASSWORD_MIN_LENGTH = 8;

export class SetupStatusDto {
  @ApiProperty({
    example: true,
    description: 'true — главного администратора ещё нет, нужна первичная настройка',
  })
  needsRoot: boolean;

  @ApiProperty({
    example: false,
    description:
      'true — локальный вход без пароля включён (DEV_LOGIN=true, не production): ' +
      'экран входа показывает кнопку «Войти без пароля»',
  })
  isDevLogin: boolean;
}

export class CreateRootDto {
  @ApiProperty({ example: 'root@copanel.app', description: 'Email главного администратора' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  email: string;

  @ApiProperty({
    example: 'super-secret-password',
    description: `Пароль, минимум ${ROOT_PASSWORD_MIN_LENGTH} символов`,
  })
  @IsString()
  @MinLength(ROOT_PASSWORD_MIN_LENGTH, {
    message: `Минимальная длина пароля — ${ROOT_PASSWORD_MIN_LENGTH} символов`,
  })
  password: string;

  @ApiProperty({ example: 'Иван', description: 'Имя', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
