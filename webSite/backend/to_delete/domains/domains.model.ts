import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface DomainCreationAttrs {
  userId: number;
  host: string;
  isMain?: boolean;
  isActive?: boolean;
  note?: string | null;
  position?: number;
}

/**
 * Домен, на котором работает сайт. Список плоский: основной домен и его
 * поддомены отличаются только флагом `isMain` — для вёрстки и для nginx
 * это всё равно просто имена хостов.
 */
@Table({
  tableName: 'domains',
  indexes: [
    { fields: ['userId'] },
    {
      // Основной домен у пользователя ровно один. Проверки в сервисе мало:
      // два параллельных запроса пройдут её оба, индекс же пропустит один.
      name: 'domains_single_main',
      unique: true,
      fields: ['userId', 'isMain'],
      where: { isMain: true },
    },
    {
      // Имя хоста уникально: два одинаковых домена означали бы, что непонятно,
      // какая из двух записей описывает сайт.
      name: 'domains_user_host',
      unique: true,
      fields: ['userId', 'host'],
    },
  ],
})
export class Domains extends Model<Domains, DomainCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер домена' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 1, description: 'Владелец домена' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  userId: number;

  @ApiProperty({ example: 100, description: 'Порядок в списке доменов' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  position: number;

  @ApiProperty({ example: 'example.com', description: 'Имя хоста без протокола и пути' })
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: '' })
  host: string;

  @ApiProperty({ example: true, description: 'Основной домен сайта — его нельзя удалить' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isMain: boolean;

  @ApiProperty({ example: true, description: 'Неактивный домен остаётся в панели, но сайт на нём не обслуживается' })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 'Домен интернет-магазина', nullable: true, description: 'Зачем нужен домен' })
  @Column({ type: DataType.TEXT, allowNull: true })
  note: string | null;
}
