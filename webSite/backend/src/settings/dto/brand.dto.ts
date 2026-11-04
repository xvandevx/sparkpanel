import { ApiProperty } from '@nestjs/swagger';
import { logoUrlOf } from '../logo';
import { SettingsValues } from '../settings-values';

/**
 * Чем панель подписана: её видно и до входа (экран входа, первичная
 * настройка), поэтому отдаётся без токена — только то, что не секрет.
 */
export class BrandDto {
  @ApiProperty({ example: 'Фаркоп.ру', description: 'Название сайта' })
  siteName: string;

  @ApiProperty({
    example: '/api/settings/logo?v=3f2a9c01b7de',
    description: 'Адрес логотипа панели; пусто — логотип SparkPanel',
  })
  logoUrl: string;

  static from(values: SettingsValues): BrandDto {
    return { siteName: values.siteName, logoUrl: logoUrlOf(values.logo) };
  }
}
