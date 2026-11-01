import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** Применённая миграция: имя и когда. Строки только добавляются. */
@Table({ tableName: 'schema_migrations', updatedAt: false })
export class SchemaMigration extends Model<SchemaMigration, { name: string }> {
  @Column({ type: DataType.STRING, primaryKey: true })
  name: string;
}
