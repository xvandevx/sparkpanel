import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { DEFAULT_SORT } from '../record-sort';
import { listMaxDepth, SITE_OWNER } from '../settings/infoblock-kinds';
import { InfoblockSettings } from '../settings/settings.model';
import { depthError } from '../settings/tree-depth';
import { PropertyValuesService } from '../values/property-values.service';
import { parentError } from '../values/records-tree';
import { DomainRow, domainAddresses, domainNameError, duplicateAddress } from './domain-name';
import { CreateDomainDto } from './dto/create-domain.dto';
import { DomainDto } from './dto/domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { Domains } from './domains.model';

/** Ключ списка доменов: по нему читаются его настройки — предел вложенности и свойства. */
const DOMAINS_LIST = 'domains';

/**
 * Домены сайта — дерево редактора контента: домены в корне, поддомены под ними.
 * Сколько уровней, решают «Уровни вложенности» списка — по умолчанию 2.
 *
 * Запись хранит то, что набрали: у поддомена — только своё имя. Полный адрес
 * складывается при выдаче, и по нему же проверяется, что двух одинаковых нет.
 *
 * Домены общие на сайт, как и остальные настройки: владельца нет, правит
 * любой пользователь панели.
 */
@Injectable()
export class DomainsService {
  constructor(
    @InjectModel(Domains) private readonly domainRepo: typeof Domains,
    // Настройки списка только читаются: предел вложенности
    @InjectModel(InfoblockSettings)
    private readonly settingsRepo: typeof InfoblockSettings,
    private readonly values: PropertyValuesService,
  ) {}

  /** Все домены плоским списком (дерево собирает фронт), по алфавиту, с полными адресами. */
  async findAll(): Promise<DomainDto[]> {
    const domains = await this.domainRepo.findAll({
      order: [
        ['sort', 'ASC'],
        ['name', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const addresses = domainAddresses(domains);
    return domains.map((domain) => DomainDto.from(domain, addresses.get(domain.id) ?? domain.name));
  }

  async create(dto: CreateDomainDto): Promise<DomainDto> {
    const parentId = dto.parentId ?? null;
    if (parentId !== null) await this.getOne(parentId);
    const address = await this.assertPlace(null, parentId, dto.name);

    const domain = await this.write(() =>
      this.domainRepo.create({
        parentId,
        name: dto.name,
        isActive: dto.isActive ?? true,
        sort: dto.sort ?? DEFAULT_SORT,
      }),
    );
    return DomainDto.from(domain, address);
  }

  /** Правка и перенос. Адреса поддоменов пересобираются сами — их имена не трогаем. */
  async update(id: number, dto: UpdateDomainDto): Promise<DomainDto> {
    const domain = await this.getOne(id);
    const parentId = dto.parentId === undefined ? domain.parentId : dto.parentId;
    if (parentId !== null && parentId !== domain.parentId) await this.getOne(parentId);
    const name = dto.name ?? domain.name;
    const address = await this.assertPlace(domain.id, parentId, name);

    await this.write(() =>
      domain.update({
        parentId,
        name,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
      }),
    );
    return DomainDto.from(domain, address);
  }

  /**
   * Удаляется домен без поддоменов: сносить их вместе с ним — не то, чего ждут
   * от клика по корзине.
   */
  async remove(id: number): Promise<void> {
    const domain = await this.getOne(id);
    if ((await this.domainRepo.count({ where: { parentId: domain.id } })) > 0) {
      throw new ConflictException('У домена есть поддомены — сначала удалите или перенесите их');
    }

    await domain.destroy();
    // Домен — запись своего списка: его значения свойств уходят вместе с ним.
    // Список общий — настройки и значения у него сайта
    await this.values.remove(DOMAINS_LIST, [String(domain.id)]);
    // И из мультидоменных значений всех списков: значение для домена, которого
    // нет, показывать некому
    await this.values.forgetDomain(domain.id);
  }

  private async getOne(id: number): Promise<Domains> {
    const domain = await this.domainRepo.findByPk(id);
    if (!domain) throw new NotFoundException('Домен не найден');
    return domain;
  }

  /**
   * Встанет ли запись (`id` null — новая) под родителя с этим именем: не в свою
   * ветку, не глубже «Уровней вложенности», с годным адресом, и ни у кого
   * больше этого адреса не окажется — ни у неё, ни у её поддоменов.
   * Возвращает её полный адрес.
   */
  private async assertPlace(id: number | null, parentId: number | null, name: string): Promise<string> {
    const [all, settings] = await Promise.all([
      this.domainRepo.findAll({ attributes: ['id', 'parentId', 'name'] }),
      // Домены общие — и настройки их списка тоже одни на сайт
      this.settingsRepo.findOne({ where: { userId: SITE_OWNER, listKey: DOMAINS_LIST } }),
    ]);
    const rows: DomainRow[] = all.map((row) => ({
      id: row.id,
      parentId: row.parentId ?? null,
      name: row.name,
    }));
    const parents = new Map(rows.map((row) => [row.id, row.parentId]));

    const placeError =
      (id === null ? null : parentError(id, parentId, parents)) ??
      depthError(parents, id, parentId, listMaxDepth(settings, DOMAINS_LIST));
    if (placeError) throw new BadRequestException(placeError);

    // Новой записи номера ещё нет — в расчёте она под нулевым, такого в базе не бывает
    const ownId = id ?? 0;
    const changed = [
      ...rows.filter((row) => row.id !== ownId),
      { id: ownId, parentId, name },
    ];
    const before = domainAddresses(rows);
    const after = domainAddresses(changed);
    const address = after.get(ownId) ?? name;

    const nameError = domainNameError(
      name,
      address,
      parentId === null ? null : after.get(parentId) ?? null,
    );
    if (nameError) throw new BadRequestException(nameError);

    const duplicate = duplicateAddress(before, after);
    if (duplicate) throw new ConflictException(`Домен ${duplicate} уже есть`);
    return address;
  }

  /** Индекс поймал то, что проверка пропустила из-за гонки. */
  private async write<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Такой домен уже есть');
      }
      throw error;
    }
  }
}
