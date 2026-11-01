import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { UserDto } from '../users/dto/user.dto';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { CreateRootDto, SetupStatusDto } from './dto/setup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Нужна ли первичная настройка (есть ли главный администратор)' })
  @ApiOkResponse({ type: SetupStatusDto })
  @Public()
  @Get('setup')
  getSetupStatus() {
    return this.authService.getSetupStatus();
  }

  @ApiOperation({ summary: 'Создать главного администратора (только пока его нет)' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiConflictResponse({ description: 'Главный администратор уже создан' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('setup')
  createRoot(@Body() dto: CreateRootDto) {
    return this.authService.createRoot(dto);
  }

  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Неверный email или пароль' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Локальный вход без пароля под главным администратором (только DEV_LOGIN=true)' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiNotFoundResponse({ description: 'Вход без пароля выключен' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('dev-login')
  devLogin() {
    return this.authService.devLogin();
  }

  @ApiOperation({ summary: 'Текущий пользователь по токену' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ description: 'Токен отсутствует, истёк или недействителен' })
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  me(@Req() req) {
    // userId — из токена (его положил AuthGuard), не из запроса
    return this.authService.me(req.user.id);
  }
}
