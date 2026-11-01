import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { McpCall } from './mcp-call.model';

export const CALL_PAGE_SIZES = [20, 50, 100] as const;

/** Вид журнала: все вызовы, только изменения или только ошибки. */
export const CALL_VIEWS = ['all', 'changes', 'errors'] as const;
export type CallView = (typeof CALL_VIEWS)[number];

export class McpCallDto {
  @ApiProperty({ example: 41 })
  id: number;

  @ApiProperty({ example: '2026-10-30T14:32:08.000Z' })
  createdAt: string;

  @ApiProperty({ example: 3 })
  tokenId: number;

  @ApiProperty({ example: 'Claude Code — ноутбук' })
  tokenName: string;

  @ApiProperty({ example: 'admin@ai-panel.app' })
  userEmail: string;

  @ApiProperty({ example: 'save_record' })
  tool: string;

  @ApiProperty({ example: 'Товары · #128 «Фаркоп Bosal 4310»' })
  what: string;

  @ApiProperty({ example: 'Цена, Категории · сразу в опубликованное' })
  detail: string;

  @ApiProperty({ example: 'Опубликовано' })
  result: string;

  @ApiProperty({ example: true, description: 'Вызов менял данные' })
  isChange: boolean;

  @ApiProperty({ example: false })
  isError: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true, description: 'С чем вызвали инструмент' })
  args: Record<string, unknown>;

  static from(call: McpCall): McpCallDto {
    const { args, ...details } = call.details;
    return {
      id: call.id,
      createdAt: call.createdAt.toISOString(),
      tokenId: call.tokenId,
      tool: call.tool,
      isChange: call.isChange,
      isError: call.isError,
      ...details,
      args: args ?? {},
    };
  }
}

export class McpCallsPageDto {
  @ApiProperty({ type: [McpCallDto] })
  items: McpCallDto[];

  @ApiProperty({ example: 135 })
  total: number;
}

export class McpCallsQueryDto {
  @ApiPropertyOptional({ example: 3, description: 'Только вызовы этого токена' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tokenId?: number;

  @ApiPropertyOptional({ example: 'save_record' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z_]{1,64}$/)
  tool?: string;

  @ApiPropertyOptional({ enum: CALL_VIEWS, example: 'changes' })
  @IsOptional()
  @IsIn(CALL_VIEWS as unknown as string[])
  view?: CallView;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, enum: CALL_PAGE_SIZES })
  @IsOptional()
  @Type(() => Number)
  @IsIn(CALL_PAGE_SIZES as unknown as number[])
  pageSize?: number;
}
