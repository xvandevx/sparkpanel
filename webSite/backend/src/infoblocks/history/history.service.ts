import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Users } from '../../users/users.model';
import { InfoblockSettings, SITE_OWNER } from '../settings/settings.model';
import { History, HistoryAction, HistoryChange } from './history.model';

/** Кто и откуда внёс правку. id и email — из JWT, ip — из запроса. */
export interface HistoryAuthor {
  id: number;
  email: string;
  ip: string | null;
  /** Правку сделали не в браузере: «MCP «Claude Code»» — журнал допишет это к автору */
  via?: string | null;
}

export interface RecordHistoryParams {
  userId: number;
  entity: string;
  entityId: string;
  entityCode?: string | null;
  entityName?: string | null;
  action: HistoryAction;
  /** Состояние до правки; для create — undefined */
  before?: Record<string, unknown> | null;
  /** Состояние после правки; для delete — undefined */
  after?: Record<string, unknown> | null;
  author: HistoryAuthor;
  transaction?: Transaction;
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(History) private readonly historyRepo: typeof History,
    // Модель, а не UsersService: журналом пользуется и сам раздел «Пользователи»,
    // а UsersModule → HistoryModule → UsersModule Nest не соберёт. Нужно отсюда
    // ровно одно — имя автора на момент правки.
    @InjectModel(Users) private readonly userRepo: typeof Users,
    // Модель, а не сервис настроек — по той же причине: настройки списков
    // импортируют разделы, которые сами пишут в журнал
    @InjectModel(InfoblockSettings) private readonly settingsRepo: typeof InfoblockSettings,
  ) {}

  /**
   * Записать изменение. Список изменённых полей считается сравнением плоских
   * снимков: `update` без единого отличия в журнал не попадает — иначе его
   * заполнили бы открыл-и-сохранил.
   */
  async record(params: RecordHistoryParams): Promise<void> {
    const changes = diffSnapshots(params.before ?? null, params.after ?? null);
    if (params.action === HistoryAction.Update && changes.length === 0) return;
    if (!(await this.isEnabled(params.entity, params.transaction))) return;

    const author = await this.userRepo.findByPk(params.author.id);

    await this.historyRepo.create(
      {
        userId: params.userId,
        entity: params.entity,
        entityId: params.entityId,
        entityCode: params.entityCode ?? null,
        entityName: params.entityName ?? null,
        action: params.action,
        changes,
        snapshot: params.after ?? params.before ?? null,
        authorId: params.author.id,
        // Правка ассистента подписана им: «Иван · MCP «Claude Code»»
        authorName: params.author.via
          ? `${author?.name || author?.email || params.author.email} · ${params.author.via}`
          : (author?.name ?? null),
        authorEmail: author?.email ?? params.author.email,
        authorIp: params.author.ip ?? null,
      },
      { transaction: params.transaction },
    );
  }

  /**
   * Ведётся ли журнал у списка: выключают его в настройках списка. Тип записи
   * в журнале и есть ключ списка (`pages`, `content-items.3`), поэтому
   * настройки ищутся по нему.
   *
   * Настройки списков одни на сайт (`SITE_OWNER`). Настроек нет — журнал
   * ведётся: так списки жили до появления галочки.
   */
  private async isEnabled(listKey: string, transaction?: Transaction): Promise<boolean> {
    const settings = await this.settingsRepo.findOne({
      where: { listKey, userId: SITE_OWNER },
      attributes: ['isHistoryEnabled'],
      transaction,
    });
    return settings?.isHistoryEnabled !== false;
  }

  /** История одной записи — от свежих к старым. */
  findByEntityId(entity: string, entityId: string) {
    return this.historyRepo.findAll({
      where: { entity, entityId },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Последняя запись журнала о записи. Нужна тем, кто пишет в чужой журнал
   * (свойства записей): код и название записи берутся отсюда, а не из тела запроса.
   */
  findLatest(entity: string, entityId: string) {
    return this.historyRepo.findOne({
      where: { entity, entityId },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Очистить журнал: весь журнал списка или, с `entityId`, историю одной записи.
   * Журнал общий, как и записи: стираются правки всех. Возвращает, сколько
   * строк стёрто.
   */
  clear(entity: string, entityId?: string): Promise<number> {
    return this.historyRepo.destroy({
      where: { entity, ...(entityId === undefined ? {} : { entityId }) },
    });
  }

  /** Общий журнал раздела, страницами. */
  findByEntity(entity: string, limit: number, offset: number) {
    return this.historyRepo.findAndCountAll({
      where: { entity },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
  }
}

/** Значения сравниваем как JSON: так одинаково ловятся строки, числа и вложенные объекты. */
const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
};

/** Изменённые поля двух снимков; ключи берём из обоих (поле могло появиться или исчезнуть). */
export function diffSnapshots(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): HistoryChange[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: HistoryChange[] = [];

  for (const field of keys) {
    const valueBefore = before?.[field] ?? null;
    const valueAfter = after?.[field] ?? null;
    if (isEqual(valueBefore, valueAfter)) continue;
    changes.push({ field, before: valueBefore, after: valueAfter });
  }

  return changes;
}
