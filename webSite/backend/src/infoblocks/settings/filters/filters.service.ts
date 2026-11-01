import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InfoblockSettingsService } from '../settings.service';
import { InfoblockFilter } from './filter.model';
import { SaveInfoblockFiltersDto } from './filter.dto';

/**
 * Набор полей фильтра таблицы списка. Один на список — по настройкам списка,
 * а они одни на сайт.
 */
@Injectable()
export class InfoblockFiltersService {
  constructor(
    @InjectModel(InfoblockFilter) private readonly filtersRepo: typeof InfoblockFilter,
    private readonly settingsService: InfoblockSettingsService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  /** Ключи полей фильтра по порядку; пусто — фильтра нет. */
  async findAll(listKey: string): Promise<string[]> {
    const settingsId = await this.settingsService.settingsId(listKey);
    if (settingsId === null) return [];

    const rows = await this.filtersRepo.findAll({
      where: { settingsId },
      order: [['position', 'ASC'], ['id', 'ASC']],
    });
    return rows.map((row) => row.key);
  }

  /** Набор полей целиком: прежние стираются, новые ложатся по порядку. */
  async save(listKey: string, dto: SaveInfoblockFiltersDto): Promise<string[]> {
    await this.sequelize.transaction(async (transaction) => {
      // Настройки у списка есть всегда: не сохраняли — заводим пустые
      const settingsId = await this.settingsService.ensureSettingsId(listKey, transaction);
      await this.filtersRepo.destroy({ where: { settingsId }, transaction });
      await this.filtersRepo.bulkCreate(
        dto.keys.map((key, position) => ({ settingsId, key, position })),
        { transaction },
      );
    });
    return this.findAll(listKey);
  }
}
