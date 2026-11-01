import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { JwtPayload } from '../../auth/auth.types';
import { McpCallDetails, McpCall } from './mcp-call.model';
import { CALL_PAGE_SIZES, McpCallDto, McpCallsPageDto, McpCallsQueryDto } from './mcp-call.dto';

/** Сколько живёт журнал. */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

/** Старое чистим не на каждом вызове, а раз в час. */
const CLEANUP_STEP_MS = 60 * 60 * 1000;

export interface NewMcpCall {
  userId: number;
  tokenId: number;
  tool: string;
  isChange: boolean;
  isError: boolean;
  details: McpCallDetails;
}

/**
 * Журнал вызовов MCP: что ассистент спрашивал и что менял. Пользователь
 * видит вызовы своих токенов, главный администратор — все.
 */
@Injectable()
export class McpCallsService {
  private cleanedAt = 0;

  constructor(@InjectModel(McpCall) private readonly callsRepo: typeof McpCall) {}

  async add(call: NewMcpCall): Promise<void> {
    await this.callsRepo.create(call);
    if (Date.now() - this.cleanedAt > CLEANUP_STEP_MS) {
      this.cleanedAt = Date.now();
      await this.callsRepo.destroy({ where: { createdAt: { [Op.lt]: new Date(Date.now() - KEEP_MS) } } });
    }
  }

  async page(viewer: JwtPayload, query: McpCallsQueryDto): Promise<McpCallsPageDto> {
    const pageSize = query.pageSize ?? CALL_PAGE_SIZES[0];
    const page = query.page ?? 1;
    const where: WhereOptions<McpCall> = {
      ...(viewer.isRoot ? {} : { userId: viewer.id }),
      ...(query.tokenId !== undefined ? { tokenId: query.tokenId } : {}),
      ...(query.tool !== undefined ? { tool: query.tool } : {}),
      ...(query.view === 'changes' ? { isChange: true } : {}),
      ...(query.view === 'errors' ? { isError: true } : {}),
    };
    const { rows, count } = await this.callsRepo.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { items: rows.map(McpCallDto.from), total: count };
  }
}
