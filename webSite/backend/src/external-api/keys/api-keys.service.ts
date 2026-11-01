import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from './api-key.model';
import { ApiKeyDto, CreatedApiKeyDto } from './api-key.dto';

/** Ключ узнаётся по приставке — его легко найти в коде сайта и в логах. */
const KEY_PREFIX = 'sp_';

/** Чаще отметку «последний запрос» не пишем: каждый запрос сайта был бы записью в базу. */
const LAST_USED_STEP_MS = 60_000;

export const hashOf = (key: string): string => createHash('sha256').update(key).digest('hex');

/** Чей ключ пришёл в запросе. */
export interface ApiKeyOwner {
  keyId: number;
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

  async create(userId: number, name: string): Promise<CreatedApiKeyDto> {
    const key = KEY_PREFIX + randomBytes(24).toString('base64url');
    const saved = await this.keysRepo.create({
      userId,
      name,
      keyHash: hashOf(key),
      keyTail: key.slice(-4),
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
    return { keyId: found.id, userId: found.userId };
  }
}
