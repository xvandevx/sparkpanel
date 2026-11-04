import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { StorageKind, StorageTarget } from '../storage/storage.service';
import { BrandDto } from './dto/brand.dto';
import { SettingsDto } from './dto/settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SETTINGS_KEYS, SettingsValues, settingsFrom, storageIdOf } from './settings-values';
import { Settings } from './settings.model';
import { Logo, logoProblem, logoVersion, parseLogo } from './logo';
import { StoragesService } from '../infoblocks/storages/storages.service';

/**
 * Настройки сайта: строка на настройку, общие на весь сайт. Читаются все
 * разом — их немного, а пишутся только изменённые ключи.
 */
@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings) private readonly settingsRepo: typeof Settings,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly storages: StoragesService,
  ) {}

  async find(): Promise<SettingsDto> {
    return SettingsDto.from(await this.values());
  }

  /** Название и адрес логотипа — то, чем подписана панель ещё до входа. */
  async brand(): Promise<BrandDto> {
    return BrandDto.from(await this.values());
  }

  /** Картинка логотипа и её версия; своего логотипа нет — null. */
  async logo(): Promise<(Logo & { version: string }) | null> {
    const { logo } = await this.values();
    const parsed = logo ? parseLogo(logo) : null;
    return parsed ? { ...parsed, version: logoVersion(logo) } : null;
  }

  /**
   * Сохранение изменённого. Выбрали для новых файлов внешнее хранилище —
   * сначала проверяем, что оно есть и отвечает: иначе о неверном ключе узнали
   * бы на первой загрузке, из карточки записи. Логотип — картинка нужного
   * типа и веса, иначе 400.
   */
  async update(dto: UpdateSettingsDto): Promise<SettingsDto> {
    const before = await this.values();
    const next: SettingsValues = {
      siteName: dto.siteName ?? before.siteName,
      // `null` — встроенное, его значение — пустая строка
      storageId:
        dto.storageId === undefined ? before.storageId : dto.storageId === null ? '' : String(dto.storageId),
      // `null` — вернуть логотип SparkPanel, его значение — пустая строка
      logo: dto.logo === undefined ? before.logo : dto.logo ?? '',
    };

    const problem = next.logo && next.logo !== before.logo ? logoProblem(next.logo) : null;
    if (problem) throw new BadRequestException(problem);

    const storageId = storageIdOf(next.storageId);
    if (storageId !== null && next.storageId !== before.storageId) {
      await this.storages.assertSelectable(storageId);
    }

    // Строка на ключ, и пишутся только изменённые: правка названия не трогает
    // выбор хранилища. Ключа ещё нет — upsert заводит его строку
    const changed = SETTINGS_KEYS.filter((key) => next[key] !== before[key]);
    await this.sequelize.transaction(async (transaction) => {
      for (const key of changed) {
        await this.settingsRepo.upsert(
          { key, value: next[key] },
          { conflictFields: ['key'], transaction },
        );
      }
    });

    return SettingsDto.from(next);
  }

  /**
   * Куда класть новый файл: выбранное хранилище и его номер — номер файл
   * запомнит, чтобы потом удалиться оттуда же.
   */
  async uploadTarget(): Promise<{ storageId: number | null; target: StorageTarget }> {
    const storageId = storageIdOf((await this.values()).storageId);
    const target = await this.storages.targetOf(storageId);
    // Выбранное хранилище удалить нельзя — пропасть оно может только руками
    // в базе; тогда файл ляжет во встроенное, а не потеряется
    return target ? { storageId, target } : { storageId: null, target: { kind: StorageKind.Builtin } };
  }

  /** Где лежит уже загруженный файл; хранилища больше нет — null. */
  targetOf(storageId: number | null): Promise<StorageTarget | null> {
    return this.storages.targetOf(storageId);
  }

  /** Все настройки: что сохранено — из базы, остальное по умолчанию. */
  private async values(): Promise<SettingsValues> {
    return settingsFrom(await this.settingsRepo.findAll());
  }
}
