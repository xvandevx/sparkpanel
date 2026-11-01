import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { AccountActor } from '../../users/users.service';
import { DEFAULT_SORT } from '../record-sort';
import { PropertyValue } from '../values/property-values.model';
import { PropertyValuesService } from '../values/property-values.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleDto } from './dto/role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from './roles.model';

/** Тип записи в журнале изменений — общий журнал раздела читается по нему же. */
export const ROLES_ENTITY = 'roles';

/** Ключ списка ролей: им роль адресуют в привязке к контенту (`{ listKey, recordId }`). */
const ROLES_LIST = 'roles';

/**
 * Роли пользователей панели. Как и учётные записи, они общие на всю панель:
 * владельца нет, изоляции по `userId` нет, её место занимает проверка роли —
 * список видят все, правит только root.
 *
 * Кому роль назначена, здесь не хранится: это значение системного свойства
 * «Роль» у пользователя. Отсюда эти значения только читаются — чтобы
 * не удалить роль, которую кто-то носит.
 */
@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Roles) private readonly roleRepo: typeof Roles,
    @InjectModel(PropertyValue) private readonly valueRepo: typeof PropertyValue,
    private readonly historyService: HistoryService,
    private readonly values: PropertyValuesService,
  ) {}

  async findAll(): Promise<RoleDto[]> {
    const [roles, linked] = await Promise.all([
      this.roleRepo.findAll({ order: [['sort', 'ASC'], ['id', 'ASC']] }),
      this.linkedIds(),
    ]);
    return roles.map((role) => RoleDto.from(role, linked.has(String(role.id))));
  }

  async create(actor: AccountActor, dto: CreateRoleDto, author: HistoryAuthor): Promise<RoleDto> {
    assertRoot(actor);

    const role = await this.roleRepo.create({
      name: dto.name,
      isActive: dto.isActive ?? true,
      sort: dto.sort ?? DEFAULT_SORT,
    });
    await this.record(actor, role, HistoryAction.Create, null, snapshot(role), author);
    return RoleDto.from(role, false);
  }

  async update(
    actor: AccountActor,
    id: number,
    dto: UpdateRoleDto,
    author: HistoryAuthor,
  ): Promise<RoleDto> {
    assertRoot(actor);

    const role = await this.getOne(id);
    const before = snapshot(role);
    await role.update({
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
    });
    await this.record(actor, role, HistoryAction.Update, before, snapshot(role), author);

    const linked = await this.linkedIds();
    return RoleDto.from(role, linked.has(String(role.id)));
  }

  /**
   * Назначенную роль не удаляем: у пользователей осталась бы ссылка в никуда,
   * а сайт не понял бы, какие у них права. Сначала роль снимают.
   */
  async remove(actor: AccountActor, id: number, author: HistoryAuthor): Promise<void> {
    assertRoot(actor);

    const role = await this.getOne(id);
    if ((await this.linkedIds()).has(String(role.id))) {
      throw new ConflictException('Роль назначена пользователям — сначала снимите её');
    }

    await this.record(actor, role, HistoryAction.Delete, snapshot(role), null, author);
    await role.destroy();
    // Роль общая на панель — и значения её свойств лежат у владельца сайта
    await this.values.remove(ROLES_LIST, [String(role.id)]);
  }

  private async getOne(id: number): Promise<Roles> {
    const role = await this.roleRepo.findByPk(id);
    if (!role) throw new NotFoundException('Роль не найдена');
    return role;
  }

  /**
   * Номера ролей, на которые ссылается хоть одна привязка к контенту. Ищем
   * по самим значениям, а не по свойству «Роль»: роль могли выбрать и в своём
   * свойстве другого списка.
   */
  private async linkedIds(): Promise<Set<string>> {
    const rows = await this.valueRepo.findAll({
      attributes: ['json'],
      where: { json: { listKey: ROLES_LIST } },
    });
    return new Set(rows.map((row) => String((row.json as { recordId?: unknown }).recordId)));
  }

  private record(
    actor: AccountActor,
    role: Roles,
    action: HistoryAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    author: HistoryAuthor,
  ) {
    return this.historyService.record({
      userId: actor.id,
      entity: ROLES_ENTITY,
      entityId: String(role.id),
      entityName: role.name,
      action,
      before,
      after,
      author,
    });
  }
}

/** Роли правит только главный администратор; роль читается из JWT. */
function assertRoot(actor: AccountActor): void {
  if (!actor.isRoot) {
    throw new ForbiddenException('Управлять ролями может только главный администратор');
  }
}

/** Плоский снимок для журнала: ключи совпадают с полями карточки. */
const snapshot = (role: Roles): Record<string, unknown> => ({
  name: role.name,
  isActive: role.isActive,
  sort: role.sort,
});
