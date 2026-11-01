import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomBytes } from 'crypto';
import { JwtPayload } from '../../auth/auth.types';
import { hashOf } from '../../external-api/keys/api-keys.service';
import { Users } from '../../users/users.model';
import { CreatedMcpTokenDto, McpTokenDto } from './mcp-token.dto';
import { McpToken } from './mcp-token.model';

/** Токен узнаётся по приставке: `spm_` — MCP, `sp_` — ключ внешнего API. */
const TOKEN_PREFIX = 'spm_';

/** Чаще отметку «последний вызов» не пишем: ассистент вызывает инструменты пачками. */
const LAST_USED_STEP_MS = 60_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Чей токен пришёл в запросе MCP: от имени этого пользователя и работает ассистент. */
export interface McpCaller {
  tokenId: number;
  tokenName: string;
  user: JwtPayload;
}

/**
 * Личные токены MCP. Любой пользователь заводит токены себе, главный
 * администратор видит и отзывает все: токен открывает панель с правами
 * своего владельца.
 */
@Injectable()
export class McpTokensService {
  constructor(
    @InjectModel(McpToken) private readonly tokensRepo: typeof McpToken,
    @InjectModel(Users) private readonly usersRepo: typeof Users,
  ) {}

  async findAll(viewer: JwtPayload): Promise<McpTokenDto[]> {
    const tokens = await this.tokensRepo.findAll({
      where: viewer.isRoot ? {} : { userId: viewer.id },
      order: [['createdAt', 'DESC']],
    });
    const emails = await this.emailsOf(tokens.map((token) => token.userId));
    return tokens.map((token) => McpTokenDto.from(token, emails.get(token.userId) ?? null));
  }

  async create(owner: JwtPayload, name: string, days: number | null): Promise<CreatedMcpTokenDto> {
    const token = TOKEN_PREFIX + randomBytes(24).toString('base64url');
    const saved = await this.tokensRepo.create({
      userId: owner.id,
      name,
      tokenHash: hashOf(token),
      tokenTail: token.slice(-4),
      expiresAt: days === null ? null : new Date(Date.now() + days * DAY_MS),
    });
    return { ...McpTokenDto.from(saved, owner.email), token };
  }

  /** Отозвать: свой — любой пользователь, чужой — только root. */
  async remove(viewer: JwtPayload, id: number): Promise<void> {
    const token = await this.tokensRepo.findByPk(id);
    if (!token) throw new NotFoundException('Токен не найден');
    if (!viewer.isRoot && token.userId !== viewer.id) {
      throw new ForbiddenException('Чужой токен отзывает только главный администратор');
    }
    await token.destroy();
  }

  /**
   * Чей токен пришёл в запросе. Нет такого, истёк, владельца выключили или
   * удалили — null: токен живёт не дольше доступа своего владельца.
   */
  async callerOf(token: string): Promise<McpCaller | null> {
    if (!token.startsWith(TOKEN_PREFIX)) return null;
    const found = await this.tokensRepo.findOne({ where: { tokenHash: hashOf(token) } });
    if (!found) return null;
    const now = new Date();
    if (found.expiresAt && found.expiresAt <= now) return null;
    const user = await this.usersRepo.findByPk(found.userId);
    if (!user || !user.isActive) return null;

    if (!found.lastUsedAt || now.getTime() - found.lastUsedAt.getTime() > LAST_USED_STEP_MS) {
      await found.update({ lastUsedAt: now });
    }
    return {
      tokenId: found.id,
      tokenName: found.name,
      user: { id: user.id, email: user.email, isRoot: user.isRoot === true, via: `MCP «${found.name}»` },
    };
  }

  private async emailsOf(userIds: number[]): Promise<Map<number, string>> {
    const ids = Array.from(new Set(userIds));
    if (ids.length === 0) return new Map();
    const users = await this.usersRepo.findAll({ where: { id: ids }, attributes: ['id', 'email'] });
    return new Map(users.map((user) => [user.id, user.email]));
  }
}
