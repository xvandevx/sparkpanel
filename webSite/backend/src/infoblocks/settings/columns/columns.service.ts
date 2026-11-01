import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InfoblockSettingsService } from '../settings.service';
import { InfoblockColumn } from './column.model';
import { InfoblockColumnDto, SaveInfoblockColumnsDto } from './column.dto';

/**
 * Вид таблицы списка: какие колонки видны, в каком порядке и какой ширины.
 * У каждого пользователя свой — `userId` из токена, и у общих списков тоже.
 */
@Injectable()
export class InfoblockColumnsService {
  constructor(
    @InjectModel(InfoblockColumn) private readonly columnsRepo: typeof InfoblockColumn,
    private readonly settingsService: InfoblockSettingsService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  /** Видимые колонки по порядку; пусто — таблицу не настраивали, колонки по умолчанию. */
  async findAll(userId: number, listKey: string): Promise<InfoblockColumnDto[]> {
    const settingsId = await this.settingsService.settingsId(listKey);
    if (settingsId === null) return [];

    const rows = await this.columnsRepo.findAll({
      where: { userId, settingsId },
      order: [['position', 'ASC'], ['id', 'ASC']],
    });
    return rows.map(toDto);
  }

  /** Вид таблицы целиком: прежние колонки стираются, новые ложатся по порядку. */
  async save(
    userId: number,
    listKey: string,
    dto: SaveInfoblockColumnsDto,
  ): Promise<InfoblockColumnDto[]> {
    await this.sequelize.transaction(async (transaction) => {
      // Настройки у списка есть всегда: не сохраняли — заводим пустые
      const settingsId = await this.settingsService.ensureSettingsId(listKey, transaction);
      await this.columnsRepo.destroy({ where: { userId, settingsId }, transaction });
      await this.columnsRepo.bulkCreate(
        dto.columns.map((column, position) => ({
          userId,
          settingsId,
          key: column.key,
          position,
          width: column.width ?? null,
        })),
        { transaction },
      );
    });
    return this.findAll(userId, listKey);
  }

  /** Вернуть колонки по умолчанию: строк нет — таблица показывает колонки раздела. */
  async reset(userId: number, listKey: string): Promise<void> {
    const settingsId = await this.settingsService.settingsId(listKey);
    if (settingsId === null) return;
    await this.columnsRepo.destroy({ where: { userId, settingsId } });
  }
}

const toDto = (column: InfoblockColumn): InfoblockColumnDto => ({
  key: column.key,
  width: column.width,
});
