import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/** Код раздела: строчные латинские буквы и цифры, между ними дефис или подчёркивание. */
export const FILE_SECTION_CODE_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export const FILE_SECTION_CODE_MESSAGE =
  'Код может содержать строчные латинские буквы, цифры, дефис и подчёркивание';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFileSectionDto {
  @ApiProperty({ example: 'banners', description: 'Код раздела — по нему его зовут из шаблонов' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FILE_SECTION_CODE_PATTERN, { message: FILE_SECTION_CODE_MESSAGE })
  code: string;

  @ApiProperty({ example: 'Баннеры', description: 'Название для админки' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
