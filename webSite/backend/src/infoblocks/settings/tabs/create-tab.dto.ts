import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { TAB_CODE_PATTERN } from './tab.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Новая вкладка карточки записи. Код необязателен: не прислали — соберём его
 * из названия. Пользователь код не вводит и не видит, вкладка живёт только
 * в карточке, а сайт читает значения по кодам свойств.
 */
export class CreateInfoblockTabDto {
  @ApiProperty({ example: 'Доставка', description: 'Подпись вкладки в карточке записи' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'dostavka', required: false, description: 'Ключ вкладки' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  @Matches(TAB_CODE_PATTERN, {
    message: 'Код вкладки: строчные латинские буквы, цифры и дефис между ними',
  })
  code?: string;
}
