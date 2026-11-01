import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { UserDto } from '../../users/dto/user.dto';

export class LoginDto {
  @ApiProperty({ example: 'root@copanel.app', description: 'Email' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  email: string;

  @ApiProperty({ example: 'secret123', description: 'Пароль, минимум 6 символов' })
  @IsString()
  @MinLength(6, { message: 'Минимальная длина пароля — 6 символов' })
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT для заголовка Authorization: Bearer <token>' })
  token: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
