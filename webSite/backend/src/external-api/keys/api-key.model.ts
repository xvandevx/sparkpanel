import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface ApiKeyCreationAttrs {
  userId: number;
  name: string;
  keyHash: string;
  keyTail: string;
}

/**
 * Ключ внешнего API. Сам ключ в базе не лежит — только его хэш (по нему ключ
 * и находят) и последние символы, чтобы ключи различались в списке. Полный
 * ключ показывается один раз, при создании.
 *
 * `userId` — кто создал ключ. Данные сайта общие: ключ открывает их все,
 * чей бы он ни был.
 */
@Table({
  tableName: 'api_keys',
  indexes: [{ name: 'api_keys_key_hash', unique: true, fields: ['keyHash'] }],
})
export class ApiKey extends Model<ApiKey, ApiKeyCreationAttrs> {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  /** SHA-256 ключа, hex. Ключ случайный и длинный — соль ему не нужна */
  @Column({ type: DataType.STRING(64), allowNull: false })
  keyHash: string;

  /** Последние 4 символа ключа — в списке ключ показывается как `sp_••••3f9a` */
  @Column({ type: DataType.STRING(8), allowNull: false })
  keyTail: string;

  @Column({ type: DataType.DATE, allowNull: true })
  lastUsedAt: Date | null;
}
