import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface McpTokenCreationAttrs {
  userId: number;
  name: string;
  tokenHash: string;
  tokenTail: string;
  expiresAt: Date | null;
}

/**
 * Личный токен MCP. Как и ключ внешнего API, в базе лежит только хэш и
 * последние символы; полный токен виден один раз, при создании.
 *
 * `userId` — чей токен: ассистент работает от имени этого пользователя, со
 * всеми его правами. Отозвать — удалить строку.
 */
@Table({
  tableName: 'mcp_tokens',
  indexes: [{ name: 'mcp_tokens_token_hash', unique: true, fields: ['tokenHash'] }],
})
export class McpToken extends Model<McpToken, McpTokenCreationAttrs> {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  /** SHA-256 токена, hex */
  @Column({ type: DataType.STRING(64), allowNull: false })
  tokenHash: string;

  /** Последние 4 символа — в списке токен показывается как `spm_••••3f9a` */
  @Column({ type: DataType.STRING(8), allowNull: false })
  tokenTail: string;

  /** До какого момента работает; null — без срока */
  @Column({ type: DataType.DATE, allowNull: true })
  expiresAt: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  lastUsedAt: Date | null;
}
