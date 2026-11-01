import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { DEFAULT_SORT } from '../record-sort';

interface DomainCreationAttrs {
  parentId: number | null;
  name: string;
  isActive?: boolean;
  sort?: number;
}

/**
 * Домен сайта — запись дерева в «Настройках» → «Домены», список редактора
 * контента с ключом `domains`. Корень — домен, под ним — его поддомены.
 * У поддомена хранится только своё имя (`ekb`), полный адрес складывается
 * с именем домена (`domain-name.ts`).
 *
 * Владельца нет: домены, как и остальные настройки сайта, одни на всех
 * пользователей панели.
 */
@Table({
  tableName: 'infoblock_domains',
  indexes: [
    // Адрес уникален: две записи с одним адресом — непонятно, какая из них
    // описывает сайт. Целиком это проверяет сервис, а индексы держат частые
    // случаи от гонки — два запроса проверку сервиса пройдут оба
    {
      // Поддомены одного домена — с разными именами
      name: 'infoblock_domains_parent_name',
      unique: true,
      fields: ['parentId', 'name'],
    },
    {
      // Домены между собой: у них `parentId` пуст, а два null индекс выше
      // считает разными
      name: 'infoblock_domains_root_name',
      unique: true,
      fields: ['name'],
      where: { parentId: null },
    },
  ],
})
export class Domains extends Model<Domains, DomainCreationAttrs> {
  @ApiProperty({ example: 1, description: 'Порядковый номер домена' })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Домен, поддоменом которого запись является; null — сам домен',
  })
  @Column({ type: DataType.INTEGER, allowNull: true })
  parentId: number | null;

  @ApiProperty({
    example: 'ekb',
    description: 'Имя хоста без протокола и пути; у поддомена — только его часть',
  })
  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Неактивный домен остаётся в панели, но сайт на нём не работает',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  isActive: boolean;

  @ApiProperty({ example: 500, description: 'Сортировка' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: DEFAULT_SORT })
  sort: number;
}
