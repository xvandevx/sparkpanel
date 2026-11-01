import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UniqueConstraintError } from 'sequelize';
import { UserDto } from '../users/dto/user.dto';
import { Users } from '../users/users.model';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { CreateRootDto, SetupStatusDto } from './dto/setup.dto';

/** Вход без пароля включён: флаг в env и не прод — проверяем при каждом запросе. */
const isDevLoginEnabled = (): boolean =>
  process.env.DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async getSetupStatus(): Promise<SetupStatusDto> {
    return { needsRoot: !(await this.usersService.hasRoot()), isDevLogin: isDevLoginEnabled() };
  }

  /**
   * Локальный вход без пароля — под главным администратором. Нужен, чтобы
   * разработчик (и Claude в панели превью) смотрел панель, не набирая пароль.
   * Включается только флагом `DEV_LOGIN=true` в `backend/.env` и никогда
   * при `NODE_ENV=production`; выключен — маршрута как будто нет (404).
   */
  async devLogin(): Promise<LoginResponseDto> {
    if (!isDevLoginEnabled()) throw new NotFoundException();
    const root = await this.usersService.findRoot();
    if (!root) throw new ConflictException('Главного администратора ещё нет — пройдите первичную настройку');
    return this.issueToken(root);
  }

  /**
   * Первичная настройка: создаёт единственного главного администратора.
   * Эндпоинт публичный, поэтому он обязан быть одноразовым — как только root есть,
   * любой следующий запрос отвергается.
   */
  async createRoot(dto: CreateRootDto): Promise<LoginResponseDto> {
    if (await this.usersService.hasRoot()) {
      throw new ConflictException('Учётная запись администратора уже существует');
    }

    let user: Users;
    try {
      user = await this.usersService.create({
        email: dto.email,
        password: dto.password,
        name: dto.name,
        isRoot: true,
      });
    } catch (error) {
      // Гонка двух параллельных запросов: проверку выше прошли оба, но уникальный
      // индекс (email или users_single_root) пропустит только один.
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Учётная запись администратора уже существует');
      }
      throw error;
    }

    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);

    // Один и тот же текст на «нет пользователя» и «неверный пароль»:
    // иначе форма логина превращается в проверялку существующих email.
    const passwordOk =
      user && (await this.usersService.comparePassword(dto.password, user.passwordHash));
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Учётная запись отключена');
    }

    return this.issueToken(user);
  }

  async me(userId: number): Promise<UserDto> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException('Учётная запись недоступна');
    return UserDto.from(user);
  }

  private async issueToken(user: Users): Promise<LoginResponseDto> {
    const payload: JwtPayload = { id: user.id, email: user.email, isRoot: user.isRoot };
    return {
      token: await this.jwtService.signAsync(payload),
      user: UserDto.from(user),
    };
  }
}
