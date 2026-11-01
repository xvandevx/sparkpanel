import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { UniqueConstraintError } from 'sequelize';
import { HistoryAction } from '../infoblocks/history/history.model';
import { HistoryAuthor, HistoryService } from '../infoblocks/history/history.service';
import { InfoblockColumn } from '../infoblocks/settings/columns/column.model';
import { PropertyValuesService } from '../infoblocks/values/property-values.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Users } from './users.model';

const BCRYPT_ROUNDS = 10;

/** Тип записи в журнале изменений — общий журнал раздела читается по нему же. */
export const USERS_ENTITY = 'users';

/**
 * Кто выполняет действие: берётся из JWT (`req.user`), НИКОГДА из тела запроса.
 * Собственный тип, а не `JwtPayload` из auth: сервис пользователей не должен
 * зависеть от модуля авторизации — зависимость там ровно обратная.
 */
export interface AccountActor {
  id: number;
  isRoot: boolean;
}

/** Значения строки при заведении учётной записи. */
interface NewUserRow {
  email: string;
  passwordHash: string;
  name?: string;
  isRoot: boolean;
  isActive: boolean;
  sort?: number;
  passwordChangedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(Users) private readonly userRepo: typeof Users,
    @InjectModel(InfoblockColumn) private readonly columnsRepo: typeof InfoblockColumn,
    private readonly historyService: HistoryService,
    private readonly values: PropertyValuesService,
  ) {}

  findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email: normalizeEmail(email) } });
  }

  findById(id: number) {
    return this.userRepo.findByPk(id);
  }

  /** Есть ли в системе главный администратор. От этого зависит экран первичной настройки. */
  /** Главный администратор; его нет — null (до первичной настройки). */
  async findRoot(): Promise<Users | null> {
    return this.userRepo.findOne({ where: { isRoot: true } });
  }

  async hasRoot(): Promise<boolean> {
    const count = await this.userRepo.count({ where: { isRoot: true } });
    return count > 0;
  }

  async create(params: { email: string; password: string; name?: string; isRoot?: boolean }) {
    return this.userRepo.create({
      email: normalizeEmail(params.email),
      passwordHash: await bcrypt.hash(params.password, BCRYPT_ROUNDS),
      name: params.name,
      isRoot: params.isRoot ?? false,
      passwordChangedAt: new Date(),
    });
  }

  comparePassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }

  // --- Раздел «Пользователи» -------------------------------------------------
  //
  // Учётные записи — единственная сущность панели без `userId`: они не принадлежат
  // тенанту, они его и определяют. Поэтому изоляции по `userId` тут нет, а её место
  // занимает проверка роли: список видят все, правит только root.

  /** Все учётные записи панели. Читать список может любой авторизованный. */
  findAll(): Promise<Users[]> {
    return this.userRepo.findAll({ order: [['sort', 'ASC'], ['id', 'ASC']] });
  }

  async findOne(id: number): Promise<Users> {
    const user = await this.userRepo.findByPk(id);
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async createAccount(
    actor: AccountActor,
    dto: CreateUserDto,
    author: HistoryAuthor,
  ): Promise<Users> {
    assertRoot(actor);

    // Признак root не берётся из запроса: через этот эндпоинт заводятся только обычные
    // пользователи, root создаётся первичной настройкой и существует в единственном числе.
    const user = await this.createRow({
      email: normalizeEmail(dto.email),
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      name: dto.name,
      isRoot: false,
      isActive: dto.isActive ?? true,
      sort: dto.sort,
      passwordChangedAt: new Date(),
    });

    await this.historyService.record({
      userId: actor.id,
      entity: USERS_ENTITY,
      entityId: String(user.id),
      entityCode: user.email,
      entityName: user.name,
      action: HistoryAction.Create,
      after: snapshot(user),
      author,
    });

    return user;
  }

  async updateAccount(
    actor: AccountActor,
    id: number,
    dto: UpdateUserDto,
    author: HistoryAuthor,
  ): Promise<Users> {
    assertRoot(actor);

    const user = await this.findOne(id);
    const before = snapshot(user);

    // Главный администратор не может отключить сам себя: в систему после этого
    // не войдёт никто, а включить его обратно будет уже некому.
    if (user.isRoot && dto.isActive === false) {
      throw new ConflictException('Главного администратора нельзя отключить');
    }

    await this.updateRow(user, {
      ...(dto.email !== undefined ? { email: normalizeEmail(dto.email) } : {}),
      ...(dto.name !== undefined ? { name: dto.name || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
      // Пароль хранится только хэшем, поэтому «поменялся ли он» сравнением не узнать:
      // прислали — значит меняем, и отмечаем этим дату для журнала.
      ...(dto.password !== undefined
        ? {
            passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
            passwordChangedAt: new Date(),
          }
        : {}),
    });

    await this.historyService.record({
      userId: actor.id,
      entity: USERS_ENTITY,
      entityId: String(user.id),
      entityCode: user.email,
      entityName: user.name,
      action: HistoryAction.Update,
      before,
      after: snapshot(user),
      author,
    });

    return user;
  }

  /**
   * Удалить учётную запись. Главного администратора удалить нельзя — он один,
   * и без него управлять панелью стало бы некому; себя root тоже не удалит,
   * потому что он и есть root.
   *
   * Вместе с записью уходят значения её свойств (роль) и вид таблиц, который
   * она себе настроила. Журнал не трогаем: в чужих журналах автор записан
   * снимком (имя и email), правки остаются подписанными.
   */
  async removeAccount(actor: AccountActor, id: number, author: HistoryAuthor): Promise<void> {
    assertRoot(actor);

    const user = await this.findOne(id);
    if (user.isRoot) {
      throw new ConflictException('Главного администратора удалить нельзя');
    }

    await this.historyService.record({
      userId: actor.id,
      entity: USERS_ENTITY,
      entityId: String(user.id),
      entityCode: user.email,
      entityName: user.name,
      action: HistoryAction.Delete,
      before: snapshot(user),
      after: null,
      author,
    });
    await user.destroy();

    // Список пользователей общий — значения его свойств лежат у владельца сайта
    await this.values.remove(USERS_ENTITY, [String(user.id)]);
    await this.columnsRepo.destroy({ where: { userId: user.id } });
  }

  /** История одной учётной записи. Журнал — часть управления, значит только root. */
  findHistory(actor: AccountActor, id: number) {
    assertRoot(actor);
    return this.historyService.findByEntityId(USERS_ENTITY, String(id));
  }

  findJournal(actor: AccountActor, limit: number, offset: number) {
    assertRoot(actor);
    return this.historyService.findByEntity(USERS_ENTITY, limit, offset);
  }

  private async createRow(values: NewUserRow): Promise<Users> {
    try {
      return await this.userRepo.create(values);
    } catch (error) {
      throw toFriendlyError(error);
    }
  }

  private async updateRow(user: Users, values: Record<string, unknown>): Promise<void> {
    try {
      await user.update(values);
    } catch (error) {
      throw toFriendlyError(error);
    }
  }
}

/**
 * Управление учётными записями — право главного администратора.
 * Признак читается из JWT (`req.user.isRoot`), так что подделать его запросом нельзя.
 */
function assertRoot(actor: AccountActor): void {
  if (!actor.isRoot) {
    throw new ForbiddenException('Управлять пользователями может только главный администратор');
  }
}

/**
 * Плоский снимок для журнала: ключи совпадают с полями формы в админке.
 * Пароля здесь нет и быть не может — только дата его смены.
 */
function snapshot(user: Users): Record<string, unknown> {
  return {
    email: user.email,
    name: user.name ?? null,
    isRoot: user.isRoot,
    isActive: user.isActive,
    sort: user.sort,
    passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt).toISOString() : null,
  };
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toFriendlyError = (error: unknown): unknown => {
  if (error instanceof UniqueConstraintError) {
    return new ConflictException('Пользователь с таким email уже есть');
  }
  return error;
};
