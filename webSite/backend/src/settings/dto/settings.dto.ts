import { ApiProperty } from '@nestjs/swagger';
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

  static from(values: SettingsValues): SettingsDto {
    return { siteName: values.siteName, storageId: storageIdOf(values.storageId) };
  }
}
