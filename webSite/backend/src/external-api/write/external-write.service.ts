import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtPayload } from '../../auth/auth.types';
import { PanelClient, PanelError } from '../../common/panel-client';
import { InfoblockSettingsService } from '../../infoblocks/settings/settings.service';
import { mcpList, type McpList } from '../../mcp/mcp-lists';
import { Users } from '../../users/users.model';
import { BATCH_LIMIT, type ApiList, type WriteField } from '../api-lists';
import { ExternalApiService } from '../external-api.service';
import type { ApiKeyOwner } from '../keys/api-keys.service';
import { canWrite } from '../keys/write-access';
import { RecordLookupService, type RecordRow } from './record-lookup.service';
import { panelValues, type LinkRef, type WriteProperty } from './write-values';

/** Тело записи: поля записи и свойства по кодам. */
export interface WriteBody {
  fields?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

/** Что стало с записью — ответ записи и строка ответа пакета. */
export interface WriteResult {
  externalId: string | null;
  id: number | null;
  status: 'created' | 'updated' | 'error';
  error?: string;
}

/** Список, в который пишут, — всё, что для этого нужно, читается раз на запрос. */
interface Target {
  list: ApiList;
  /** Маршруты раздела в панели — те же, куда пишет MCP */
  section: McpList;
  /** Поля записи, которые список сейчас принимает */
  fields: WriteField[];
  properties: WriteProperty[];
  user: JwtPayload;
}

/**
 * Запись во внешнее API. Своих правил записи здесь нет: как и MCP, ключ
 * пишет маршрутами панели (`PanelClient`) от имени того, кто его создал, —
 * с теми же DTO, проверками разделов и журналом, а журнал подписывает правку
 * «… · API «ключ»». Поэтому свойства «Внешний источник» ключ заполнять может,
 * а панель — нет.
 *
 * Своё здесь — то, чего у панели нет: адресация кодами и внешним ID
 * и запись «поля + свойства» одним вызовом. Поля и свойства — два маршрута
 * панели, две транзакции; если второй не прошёл, первый откатывается вручную:
 * только что созданная запись удаляется, у правленой возвращаются прежние
 * поля. Иначе запись осталась бы без внешнего ID, и следующий обмен завёл бы
 * дубль. Всё, что можно проверить до записи (коды свойств, варианты,
 * привязки, занятый внешний ID), проверяется до неё.
 */
@Injectable()
export class ExternalWriteService {
  constructor(
    private readonly api: ExternalApiService,
    private readonly settings: InfoblockSettingsService,
    private readonly lookup: RecordLookupService,
    private readonly panel: PanelClient,
    @InjectModel(Users) private readonly usersRepo: typeof Users,
  ) {}

  async create(owner: ApiKeyOwner, path: string, body: WriteBody): Promise<WriteResult> {
    const target = await this.target(owner, path);
    return this.run(() => this.createIn(target, body, externalIdOf(body.fields?.externalId)));
  }

  async update(owner: ApiKeyOwner, path: string, idOrCode: string, body: WriteBody): Promise<WriteResult> {
    const target = await this.target(owner, path);
    const row = await this.rowByIdOrCode(target, idOrCode);
    const externalId = externalIdOf(body.fields?.externalId);
    await this.run(() => this.updateIn(target, row, body, externalId));
    return {
      externalId: externalId !== undefined ? externalId : await this.lookup.externalIdOf(target.list.listKey, row.id),
      id: row.id,
      status: 'updated',
    };
  }

  /** Upsert по внешнему ID: запись есть — правится, нет — заводится с этим ID. */
  async upsert(owner: ApiKeyOwner, path: string, externalId: string, body: WriteBody): Promise<WriteResult> {
    const target = await this.target(owner, path);
    return this.run(() => this.upsertIn(target, requiredExternalId(externalId), body));
  }

  async remove(owner: ApiKeyOwner, path: string, idOrCode: string): Promise<void> {
    const target = await this.target(owner, path);
    const row = await this.rowByIdOrCode(target, idOrCode);
    await this.run(() => this.panel.delete(target.user, this.sectionPath(target, row.id)));
  }

  async removeByExternalId(owner: ApiKeyOwner, path: string, externalId: string): Promise<void> {
    const target = await this.target(owner, path);
    const id = await this.lookup.idByExternalId(target.list.listKey, requiredExternalId(externalId));
    if (id === null) throw new NotFoundException('Запись не найдена');
    await this.run(() => this.panel.delete(target.user, this.sectionPath(target, id)));
  }

  /**
   * Пакет upsert по внешнему ID — по одной записи, по порядку: ошибка одной
   * не останавливает остальные, а запись, заведённая раньше в том же пакете,
   * уже видна следующим (дерево через `parentExternalId`).
   */
  async batch(owner: ApiKeyOwner, path: string, items: (WriteBody & { externalId: string })[]): Promise<{ items: WriteResult[] }> {
    if (items.length > BATCH_LIMIT) throw new BadRequestException(`В пакете не больше ${BATCH_LIMIT} записей`);
    const target = await this.target(owner, path);
    const results: WriteResult[] = [];
    for (const item of items) {
      try {
        results.push(await this.run(() => this.upsertIn(target, requiredExternalId(item.externalId), item)));
      } catch (error) {
        results.push({ externalId: item.externalId, id: null, status: 'error', error: messageOf(error) });
      }
    }
    return { items: results };
  }

  private async upsertIn(target: Target, externalId: string, body: WriteBody): Promise<WriteResult> {
    if (body.fields?.externalId !== undefined) {
      throw new BadRequestException('Внешний ID записи — в адресе; в fields его не присылают');
    }
    const id = await this.lookup.idByExternalId(target.list.listKey, externalId);
    const row = id === null ? null : await this.lookup.row(target.list.listKey, id);
    if (!row) return this.createIn(target, body, externalId);
    await this.updateIn(target, row, body, undefined);
    return { externalId, id: row.id, status: 'updated' };
  }

  private async createIn(target: Target, body: WriteBody, externalId: string | null | undefined): Promise<WriteResult> {
    const { list, user } = target;
    const values = await this.valuesOf(target, body);
    const fields = await this.sectionFields(target, body);
    if (externalId) await this.assertFreeExternalId(list.listKey, externalId, null);

    const created = await this.panel.post<{ id: number }>(user, this.sectionPath(target), fields);
    if (values.length > 0 || externalId) {
      try {
        await this.panel.patch(user, this.valuesPath(target, created.id), { values, ...(externalId ? { externalId } : {}) });
      } catch (error) {
        // Без свойств и внешнего ID запись не нужна: следующий обмен завёл бы её заново
        await this.panel.delete(user, this.sectionPath(target, created.id)).catch(() => undefined);
        throw error;
      }
    }
    return { externalId: externalId ?? null, id: created.id, status: 'created' };
  }

  /** Правка записи; `externalId` — новый внешний ID, не прислали — прежний. */
  private async updateIn(
    target: Target,
    row: RecordRow,
    body: WriteBody,
    externalId: string | null | undefined,
  ): Promise<void> {
    const { list, user } = target;
    const values = await this.valuesOf(target, body);
    const fields = changedFields(await this.sectionFields(target, body), row);
    if (externalId) await this.assertFreeExternalId(list.listKey, externalId, row.id);

    const isFieldsChanged = Object.keys(fields).length > 0;
    // Прежние поля — до правки: ими откатываются, если свойства не лягут
    const before = Object.fromEntries(Object.keys(fields).map((key) => [key, row[key]]));
    if (isFieldsChanged) await this.panel.patch(user, this.sectionPath(target, row.id), fields);
    if (values.length > 0 || externalId !== undefined) {
      try {
        await this.panel.patch(user, this.valuesPath(target, row.id), {
          values,
          ...(externalId !== undefined ? { externalId } : {}),
        });
      } catch (error) {
        if (isFieldsChanged) await this.panel.patch(user, this.sectionPath(target, row.id), before).catch(() => undefined);
        throw error;
      }
    }
  }

  /**
   * Список по адресу и всё для записи в него. Сначала права: ключ без права
   * записи или не в этот список — 403, раньше любых проверок тела.
   */
  private async target(owner: ApiKeyOwner, path: string): Promise<Target> {
    const list = await this.api.listAt(path);
    if (!canWrite(owner, list.listKey)) throw new ForbiddenException(`Ключу не разрешена запись в «${list.name}»`);

    // Пишет создатель ключа: им подписан журнал. Нет его или выключен — писать некому
    const creator = await this.usersRepo.findByPk(owner.userId);
    if (!creator || !creator.isActive) {
      throw new ForbiddenException('Создатель ключа удалён или выключен — запись недоступна, создайте новый ключ');
    }
    const [settings, { properties }] = await Promise.all([
      this.settings.findOne(list.listKey),
      this.settings.settingsOf(list.listKey),
    ]);
    const isTree = settings.maxDepth !== 1;
    return {
      list,
      section: mcpList(list.listKey),
      fields: list.writeFields.filter(
        (field) =>
          (field !== 'code' || settings.useCode) && ((field !== 'parentId' && field !== 'parentExternalId') || isTree),
      ),
      properties: properties as WriteProperty[],
      user: {
        id: creator.id,
        email: creator.email,
        isRoot: creator.isRoot === true,
        via: `API «${owner.keyName}»`,
      },
    };
  }

  /** Запись по номеру или коду: номер — если такая есть, иначе код. */
  private async rowByIdOrCode(target: Target, idOrCode: string): Promise<RecordRow> {
    const { listKey } = target.list;
    const byId = /^\d+$/.test(idOrCode) ? await this.lookup.row(listKey, Number(idOrCode)) : null;
    if (byId) return byId;
    const id = await this.lookup.idByCode(listKey, idOrCode);
    const row = id === null ? null : await this.lookup.row(listKey, id);
    if (!row) throw new NotFoundException('Запись не найдена');
    return row;
  }

  /**
   * Поля для маршрута раздела: только те, что список принимает, — лишнее
   * 400, а не тишина. Родитель внешним ID — в номер родителя.
   */
  private async sectionFields(target: Target, body: WriteBody): Promise<Record<string, unknown>> {
    const fields = body.fields ?? {};
    const extra = Object.keys(fields).filter((key) => !target.fields.includes(key as WriteField));
    if (extra.length > 0) {
      throw new BadRequestException(`Таких полей у записи нет: ${extra.join(', ')}. Есть: ${target.fields.join(', ')}`);
    }
    const { externalId: _externalId, parentExternalId, ...rest } = fields;
    if (parentExternalId === undefined) return rest;
    if (rest.parentId !== undefined) throw new BadRequestException('Родитель — parentId или parentExternalId, не оба');
    if (parentExternalId === null) return { ...rest, parentId: null };
    const parentId = await this.lookup.idByExternalId(target.list.listKey, String(parentExternalId));
    if (parentId === null) throw new BadRequestException(`Нет записи с внешним ID «${String(parentExternalId)}» — родителя`);
    return { ...rest, parentId };
  }

  private valuesOf(target: Target, body: WriteBody) {
    return panelValues(target.properties, body.properties ?? {}, (listKey, ref) => this.linked(listKey, ref));
  }

  /** Привязка: номер — как есть (существование проверит маршрут значений), код и внешний ID — поиском. */
  private async linked(listKey: string, ref: LinkRef): Promise<number> {
    if ('id' in ref) return ref.id;
    if ('externalId' in ref) {
      const id = await this.lookup.idByExternalId(listKey, ref.externalId);
      if (id === null) throw new BadRequestException(`В «${listKey}» нет записи с внешним ID «${ref.externalId}»`);
      return id;
    }
    if (!this.lookup.hasCode(listKey)) {
      throw new BadRequestException(`Записи «${listKey}» по коду не ищутся — укажите номер или { "externalId": "…" }`);
    }
    const id = await this.lookup.idByCode(listKey, ref.code);
    if (id === null) throw new BadRequestException(`В «${listKey}» нет записи с кодом «${ref.code}»`);
    return id;
  }

  private async assertFreeExternalId(listKey: string, externalId: string, ownId: number | null): Promise<void> {
    const taken = await this.lookup.idByExternalId(listKey, externalId);
    if (taken !== null && taken !== ownId) throw new ConflictException(`Внешний ID «${externalId}» уже у записи #${taken}`);
  }

  private sectionPath({ section }: Target, id?: number): string {
    const base = section.path(section.owner);
    return id === undefined ? base : `${base}/${id}`;
  }

  private valuesPath({ list }: Target, id: number): string {
    return `/infoblocks/${list.listKey}/values/${id}`;
  }

  /** Ошибка маршрута панели — тем же кодом и текстом, что видит панель. */
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof PanelError) throw new HttpException(error.message, error.status);
      throw error;
    }
  }
}

/** Внешний ID из тела: пустая строка — стереть (null), не прислали — undefined. */
function externalIdOf(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string' && typeof raw !== 'number') throw new BadRequestException('externalId — строка');
  const value = String(raw).trim();
  if (value.length > 255) throw new BadRequestException('externalId — не длиннее 255 символов');
  return value === '' ? null : value;
}

function requiredExternalId(raw: unknown): string {
  const value = externalIdOf(raw);
  if (!value) throw new BadRequestException('Нужен внешний ID записи');
  return value;
}

/** Поля, которые правка действительно меняет: то же самое раздел не дёргаем. */
function changedFields(fields: Record<string, unknown>, row: RecordRow): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([key, value]) => (row[key] ?? null) !== (value ?? null)));
}

const messageOf = (error: unknown): string => {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message = typeof response === 'object' ? (response as { message?: unknown }).message : response;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Не удалось сохранить запись';
};
