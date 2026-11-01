import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** Что о вызове показывает журнал, кроме того, по чему его отбирают. */
export interface McpCallDetails {
  tokenName: string;
  userEmail: string;
  /** Что затронуто: «Товары · #128 «Фаркоп»»; пусто у вызова без списка */
  what: string;
  /** Подробность: что поменяли, сколько нашли, текст ошибки */
  detail: string;
  /** Итог одной фразой: «Выполнено», «Черновик сохранён», «409 · …» */
  result: string;
  /** С чем вызвали инструмент — как прислал ассистент */
  args: Record<string, unknown>;
}

interface McpCallCreationAttrs {
  userId: number;
  tokenId: number;
  tool: string;
  isChange: boolean;
  isError: boolean;
  details: McpCallDetails;
}

/**
 * Вызов инструмента MCP. Своими колонками — только то, по чему журнал
 * отбирают (чей, какой токен, инструмент, изменение ли, ошибка ли);
 * остальное — одним JSON: его только показывают, и новому инструменту
 * не нужны новые колонки. Хранится 30 дней.
 */
@Table({
  tableName: 'mcp_calls',
  updatedAt: false,
  indexes: [{ fields: ['userId', 'createdAt'] }, { fields: ['createdAt'] }],
})
export class McpCall extends Model<McpCall, McpCallCreationAttrs> {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  /** Номер токена; отозванный токен из журнала не пропадает — его имя в `details` */
  @Column({ type: DataType.INTEGER, allowNull: false })
  tokenId: number;

  @Column({ type: DataType.STRING(64), allowNull: false })
  tool: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  isChange: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  isError: boolean;

  @Column({ type: DataType.JSONB, allowNull: false })
  details: McpCallDetails;
}
