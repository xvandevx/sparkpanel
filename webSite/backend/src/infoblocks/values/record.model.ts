import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface InfoblockRecordCreationAttrs {
  settingsId: number;
  recordKey: string;
  parentId?: string | null;
}

/**
 * Запись списка глазами настроек: её место в дереве. Сама запись живёт
 * в таблице своего раздела — здесь только то, что задаётся настройками списка
 * и потому не может лежать в таблице раздела.
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
}
