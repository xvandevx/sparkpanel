import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from './api-key.model';
import { ApiKeyDto, CreateApiKeyDto, CreatedApiKeyDto } from './api-key.dto';
import type { WriteRights } from './write-access';

/** Ключ узнаётся по приставке — его легко найти в коде сайта и в логах. */
const KEY_PREFIX = 'sp_';

/** Чаще отметку «последний запрос» не пишем: каждый запрос сайта был бы записью в базу. */
const LAST_USED_STEP_MS = 60_000;

export const hashOf = (key: string): string => createHash('sha256').update(key).digest('hex');

/** Чей ключ пришёл в запросе и что ему можно. */
export interface ApiKeyOwner extends WriteRights {
  keyId: number;
  /** Название ключа — им журнал подписывает правки: «API «1С»» */
  keyName: string;
  userId: number;
}

/**
 * Ключи внешнего API: создать, показать список, отозвать — и узнать владельца
 * по ключу из запроса. Ключи общие на панель (их видит любой root), а данные
 * ключ читает того, кто его создал.
 */
@Injectable()
export class ApiKeysService {
  constructor(@InjectModel(ApiKey) private readonly keysRepo: typeof ApiKey) {}

  async findAll(): Promise<ApiKeyDto[]> {
    const keys = await this.keysRepo.findAll({ order: [['createdAt', 'DESC']] });
    return keys.map(ApiKeyDto.from);
  }

  /**
   * Новый ключ. Права задаются здесь и больше не меняются; `listKeys` — какие
   * списки сейчас есть во внешнем API: писать можно только в них.
   */
  async create(userId: number, dto: CreateApiKeyDto, listKeys: string[]): Promise<CreatedApiKeyDto> {
    const isWritable = dto.isWritable === true;
    const writeLists = isWritable ? dto.writeLists ?? null : null;
    const unknown = (writeLists ?? []).filter((listKey) => !listKeys.includes(listKey));
    if (unknown.length > 0) throw new BadRequestException(`Во внешнем API нет списков: ${unknown.join(', ')}`);

    const key = KEY_PREFIX + randomBytes(24).toString('base64url');
    const saved = await this.keysRepo.create({
      userId,
      name: dto.name,
      keyHash: hashOf(key),
      keyTail: key.slice(-4),
      isWritable,
      writeLists: writeLists === null ? null : Array.from(new Set(writeLists)),
    });
    return { ...ApiKeyDto.from(saved), key };
  }

  async remove(id: number): Promise<void> {
    const removed = await this.keysRepo.destroy({ where: { id } });
    if (removed === 0) throw new NotFoundException('Ключ не найден');
  }

  /** Владелец ключа из запроса; нет такого ключа (или его отозвали) — null. */
  async ownerOf(key: string): Promise<ApiKeyOwner | null> {
    if (!key.startsWith(KEY_PREFIX)) return null;
    const found = await this.keysRepo.findOne({ where: { keyHash: hashOf(key) } });
    if (!found) return null;
    const now = new Date();
    if (!found.lastUsedAt || now.getTime() - found.lastUsedAt.getTime() > LAST_USED_STEP_MS) {
      await found.update({ lastUsedAt: now });
    }
    return {
      keyId: found.id,
      keyName: found.name,
      userId: found.userId,
      isWritable: found.isWritable === true,
      writeLists: found.writeLists ?? null,
    };
  }
}
