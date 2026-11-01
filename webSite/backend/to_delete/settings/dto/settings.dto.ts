import { ApiProperty } from '@nestjs/swagger';
import { Settings } from '../settings.model';

/** Настройки сайта в том виде, в каком их показывает админка. */
export class SettingsDto {
  @ApiProperty({ example: 'CoPanel', description: 'Название сайта' })
  siteName: string;

  static from(settings: Settings): SettingsDto {
    return { siteName: settings.siteName ?? '' };
  }

  /** Пока пользователь ничего не сохранял, строки настроек нет — отдаём пустые значения. */
  static empty(): SettingsDto {
    return { siteName: '' };
  }
}
