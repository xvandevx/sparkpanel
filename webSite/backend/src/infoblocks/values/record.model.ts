import { ApiProperty } from '@nestjs/swagger';
import { Op } from 'sequelize';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockRecordCreationAttrs {
  settingsId: number;
  recordKey: string;
  parentId?: string | null;
  externalId?: string | null;
}

/**
 * Запись списка глазами настроек: её место в дереве. Сама запись живёт
 * в таблице своего раздела — здесь только то, что задаётся настройками списка
 * и потому не может лежать в таблице раздела.
 *
 * Здесь же внешний ID — номер записи в системе-источнике: он есть у записи
 * любого списка, а общая на все списки строка только эта. Задаёт его
 * интеграция (внешнее API, MCP), панель только показывает.
 *
 * Значения свойств лежат отдельно, по строке на значение, и ссылаются сюда:
 * удалили запись — ушли и они, каскадом.
 */
@Table({
  tableName: 'infoblock_records',
  indexes: [
    {
      name: 'infoblock_records_settings_key',
      unique: true,
      fields: ['settingsId', 'recordKey'],
    },
    // Внешний ID уникален в списке; пустые не мешают друг другу
    {
      name: 'infoblock_records_external_id',
      unique: true,
      fields: ['settingsId', 'externalId'],
      where: { externalId: { [Op.ne]: null } },
    },
  ],
})
export class InfoblockRecord extends Model<InfoblockRecord, InfoblockRecordCreationAttrs> {
  @ApiProperty({ example: 1 })
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ApiProperty({ example: 7, description: 'Настройки списка, к которому относится запись' })
  @Column({ type: DataType.INTEGER, allowNull: false })
  settingsId: number;

  @ApiProperty({ example: 'element-7', description: 'Ключ записи в её разделе' })
  @Column({ type: DataType.STRING, allowNull: false })
  recordKey: string;

  @ApiProperty({
    example: 'element-3',
    nullable: true,
    description: 'Родитель в дереве списка; у плоского списка null',
  })
  @Column({ type: DataType.STRING, allowNull: true })
  parentId: string | null;

  @ApiProperty({
    example: '1C-000123',
    nullable: true,
    description: 'Внешний ID — номер записи в системе-источнике; уникален в списке',
  })
  @Column({ type: DataType.STRING(255), allowNull: true })
  externalId: string | null;
}
