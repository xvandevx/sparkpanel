import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { TabDef } from '../properties/property';

/** Пробелы по краям срезаются до проверки: иначе вкладка из одних пробелов молча пропадала. */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Код вкладки — как у остальных кодов панели: строчные латинские буквы, цифры, дефис. */
export const TAB_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Вкладка карточки записи: свойства ссылаются на неё кодом. */
export class InfoblockTabDto implements TabDef {
  @ApiProperty({ example: 2, description: 'Номер вкладки: по нему её правят и удаляют' })
  id: number;

  @ApiProperty({ example: 'seo', description: 'Ключ вкладки; на него ссылается свойство' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(TAB_CODE_PATTERN, {
    message: 'Код вкладки: строчные латинские буквы, цифры и дефис между ними',
  })
  code: string;

  @ApiProperty({ example: 'SEO', description: 'Подпись вкладки в карточке записи' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
