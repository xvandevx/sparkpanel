import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { McpToken } from './mcp-token.model';

/** Сроки, из которых выбирают при создании, — дней; null — без срока. */
export const TOKEN_TERMS = [30, 90, 365] as const;

/** Токен в списке: без самого токена — его нет и в базе. */
export class McpTokenDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Claude Code — ноутбук' })
  name: string;

  @ApiProperty({ example: '3f9a', description: 'Последние символы токена' })
  tokenTail: string;

  @ApiProperty({ example: 1, description: 'Кто создал: ассистент работает с его правами' })
  userId: number;

  @ApiProperty({ example: 'admin@ai-panel.app', nullable: true, type: String, description: 'null — пользователя уже нет' })
  userEmail: string | null;

  @ApiProperty({ example: '2027-01-28T09:12:00.000Z', nullable: true, type: String, description: 'null — без срока' })
  expiresAt: string | null;

  @ApiProperty({ example: '2026-10-30T09:12:00.000Z', nullable: true, type: String, description: 'null — вызовов ещё не было' })
  lastUsedAt: string | null;

  @ApiProperty({ example: '2026-10-29T15:40:00.000Z' })
  createdAt: string;

  static from(token: McpToken, userEmail: string | null): McpTokenDto {
    return {
      id: token.id,
      name: token.name,
      tokenTail: token.tokenTail,
      userId: token.userId,
      userEmail,
      expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
      lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
      createdAt: token.createdAt.toISOString(),
    };
  }
}

/** Только что созданный токен — единственный раз, когда он виден целиком. */
export class CreatedMcpTokenDto extends McpTokenDto {
  @ApiProperty({ example: 'spm_q7Jx…3f9a', description: 'Токен целиком; больше его не покажут' })
  token: string;
}

export class CreateMcpTokenDto {
  @ApiProperty({ example: 'Claude Code — ноутбук', description: 'Где стоит токен — чтобы потом знать, что отзывать' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Укажите название токена' })
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 90,
    nullable: true,
    enum: TOKEN_TERMS,
    type: Number,
    description: 'Срок действия в днях; null — без срока',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(TOKEN_TERMS as unknown as number[])
  days: number | null;
}
