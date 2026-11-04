import { ApiProperty } from '@nestjs/swagger';
import { logoUrlOf } from '../logo';
import { SettingsValues, storageIdOf } from '../settings-values';

/** Настройки сайта в том виде, в каком их показывает админка. */
export class SettingsDto {
  @ApiProperty({ example: 'CoPanel', description: 'Название сайта' })
  siteName: string;

  @ApiProperty({
    example: null,
    nullable: true,
    type: Number,
    description: 'Хранилище для новых файлов; null — встроенное',
  })
  storageId: number | null;

  @ApiProperty({
    example: '/api/settings/logo?v=3f2a9c01b7de',
    description: 'Адрес логотипа панели; пусто — логотип SparkPanel',
  })
  logoUrl: string;

  static from(values: SettingsValues): SettingsDto {
    return {
      siteName: values.siteName,
      storageId: storageIdOf(values.storageId),
      logoUrl: logoUrlOf(values.logo),
    };
  }
}
