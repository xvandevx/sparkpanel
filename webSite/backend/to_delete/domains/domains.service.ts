import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { HistoryAction } from '../history/history.model';
import { HistoryAuthor, HistoryService } from '../history/history.service';
import { Domains } from './domains.model';
import { CreateDomainDto } from './dto/create-domain.dto';
import { DomainDto } from './dto/domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

/** Тип записи в журнале изменений — общий журнал раздела читается по нему же. */
export const DOMAINS_ENTITY = 'domains';

/** Шаг сортировки: между соседями остаётся место, чтобы вставить домен вручную. */
const POSITION_STEP = 100;

@Injectable()
export class DomainsService {
  constructor(
    @InjectModel(Domains) private readonly domainRepo: typeof Domains,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly historyService: HistoryService,
  ) {}

  /**
   * Все домены пользователя: основной первым, дальше по порядку.
   * Заодно гарантирует основной домен — список никогда не бывает пустым,
   * а остальным доменам нужно, к чему достраивать короткие имена.
   */
  async findAll(userId: number): Promise<DomainDto[]> {
    await this.ensureMain(userId);
    const domains = await this.domainRepo.findAll({
      where: { userId },
      order: [
        ['isMain', 'DESC'],
        ['position', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
    return domains.map(DomainDto.from);
  }

  async findOne(userId: number, id: number): Promise<DomainDto> {
    return DomainDto.from(await this.getOwnDomain(userId, id));
  }

  async create(
    userId: number,
    dto: CreateDomainDto,
    author: HistoryAuthor,
  ): Promise<DomainDto> {
    const main = await this.ensureMain(userId);
    const host = completeHost(dto.host, main.host);

    return this.sequelize.transaction(async (transaction) => {
      const domain = await this.createRow(
        {
          userId,
          host,
          isActive: dto.isActive ?? true,
          note: dto.note ?? null,
          position: dto.position ?? (await this.nextPosition(userId, transaction)),
        },
        transaction,
      );

      await this.historyService.record({
        userId,
        entity: DOMAINS_ENTITY,
        entityId: String(domain.id),
        entityCode: domain.host,
        entityName: domain.host,
        action: HistoryAction.Create,
        after: snapshot(domain),
        author,
        transaction,
      });

      return DomainDto.from(domain);
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateDomainDto,
    author: HistoryAuthor,
  ): Promise<DomainDto> {
    const domain = await this.getOwnDomain(userId, id);
    const before = snapshot(domain);

    // Короткое имя достраивается основным доменом, но самому основному дополнять
    // нечем: он и есть то, к чему достраивают остальные.
    const main = domain.isMain ? null : await this.ensureMain(userId);
    const host = dto.host === undefined ? undefined : completeHost(dto.host, main?.host ?? '');

    return this.sequelize.transaction(async (transaction) => {
      await this.updateRow(
        domain,
        {
          ...(host !== undefined ? { host } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          ...(dto.position !== undefined ? { position: dto.position } : {}),
        },
        transaction,
      );

      await this.historyService.record({
        userId,
        entity: DOMAINS_ENTITY,
        entityId: String(domain.id),
        entityCode: domain.host,
        entityName: domain.host,
        action: HistoryAction.Update,
        before,
        after: snapshot(domain),
        author,
        transaction,
      });

      return DomainDto.from(domain);
    });
  }

  /** Удаление домена. Основной остаётся всегда: без него сайта нет. */
  async remove(userId: number, id: number, author: HistoryAuthor): Promise<void> {
    const domain = await this.getOwnDomain(userId, id);
    if (domain.isMain) {
      throw new BadRequestException('Основной домен сайта удалить нельзя');
    }

    const before = snapshot(domain);
    await this.sequelize.transaction(async (transaction) => {
      await this.historyService.record({
        userId,
        entity: DOMAINS_ENTITY,
        entityId: String(domain.id),
        entityCode: domain.host,
        entityName: domain.host,
        action: HistoryAction.Delete,
        before,
        author,
        transaction,
      });

      await this.domainRepo.destroy({ where: { userId, id: domain.id }, transaction });
    });
  }

  findHistory(userId: number, id: number) {
    return this.historyService.findByEntityId(userId, DOMAINS_ENTITY, String(id));
  }

  findJournal(userId: number, limit: number, offset: number) {
    return this.historyService.findByEntity(userId, DOMAINS_ENTITY, limit, offset);
  }

  /**
   * Основной домен пользователя; заводится при первом обращении к списку
   * пустым — имя хоста в него вписывают уже в админке.
   */
  private async ensureMain(userId: number): Promise<Domains> {
    const existing = await this.domainRepo.findOne({ where: { userId, isMain: true } });
    if (existing) return existing;

    try {
      return await this.domainRepo.create({ userId, host: '', isMain: true, position: 0 });
    } catch (error) {
      // Гонка двух первых запросов: проверку выше прошли оба, индекс
      // domains_single_main пропустил одного — второму отдаём уже созданный.
      if (error instanceof UniqueConstraintError) {
        const main = await this.domainRepo.findOne({ where: { userId, isMain: true } });
        if (main) return main;
      }
      throw error;
    }
  }

  private async getOwnDomain(userId: number, id: number): Promise<Domains> {
    // Фильтр по userId, а не только по id: домены всех пользователей в одной таблице.
    const domain = await this.domainRepo.findOne({ where: { id, userId } });
    if (!domain) throw new NotFoundException('Домен не найден');
    return domain;
  }

  private async nextPosition(userId: number, transaction: Transaction): Promise<number> {
    const max = await this.domainRepo.max('position', { where: { userId }, transaction });
    return (Number(max) || 0) + POSITION_STEP;
  }

  private async createRow(
    values: {
      userId: number;
      host: string;
      isActive: boolean;
      note: string | null;
      position: number;
    },
    transaction: Transaction,
  ): Promise<Domains> {
    try {
      return await this.domainRepo.create(values, { transaction });
    } catch (error) {
      throw toFriendlyError(error);
    }
  }

  private async updateRow(
    domain: Domains,
    values: Record<string, unknown>,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await domain.update(values, { transaction });
    } catch (error) {
      throw toFriendlyError(error);
    }
  }
}

/**
 * Имя без точки достраивается основным доменом: `shop` при `example.com`
 * превращается в `shop.example.com` — так поддомен и называют в разговоре.
 * Основного домена ещё нет — оставляем как ввели: дописывать не к чему.
 */
export function completeHost(host: string, mainHost: string): string {
  return mainHost && !host.includes('.') ? `${host}.${mainHost}` : host;
}

/**
 * Плоский снимок для журнала: ключи совпадают с полями формы в админке,
 * поэтому в истории видно, что поменялся именно «Домен», а не «запись».
 */
function snapshot(domain: Domains): Record<string, unknown> {
  return {
    host: domain.host,
    isMain: domain.isMain,
    isActive: domain.isActive,
    note: domain.note ?? null,
    position: domain.position,
  };
}

const toFriendlyError = (error: unknown): unknown => {
  if (error instanceof UniqueConstraintError) {
    return new ConflictException('Такой домен уже есть в списке');
  }
  return error;
};
