import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { SettingsDto } from './dto/settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Settings } from './settings.model';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings) private readonly settingsRepo: typeof Settings) {}

  /**
   * Настройки пользователя. Строку на чтении не заводим: пока ничего не сохраняли,
   * настройки — это пустые значения, а не запись из пустых строк.
   */
  async find(userId: number): Promise<SettingsDto> {
    const settings = await this.settingsRepo.findOne({ where: { userId } });
    return settings ? SettingsDto.from(settings) : SettingsDto.empty();
  }

  async update(userId: number, dto: UpdateSettingsDto): Promise<SettingsDto> {
    const settings = await this.ensure(userId);
    await settings.update({
      ...(dto.siteName !== undefined ? { siteName: dto.siteName } : {}),
    });
    return SettingsDto.from(settings);
  }

  /** Строка настроек пользователя; заводится при первом сохранении. */
  private async ensure(userId: number): Promise<Settings> {
    const existing = await this.settingsRepo.findOne({ where: { userId } });
    if (existing) return existing;

    try {
      return await this.settingsRepo.create({ userId });
    } catch (error) {
      // Гонка двух первых сохранений: проверку выше прошли оба, индекс
      // settings_single_per_user пропустил одного — второму отдаём уже созданную.
      if (error instanceof UniqueConstraintError) {
        const settings = await this.settingsRepo.findOne({ where: { userId } });
        if (settings) return settings;
      }
      throw error;
    }
  }
}
