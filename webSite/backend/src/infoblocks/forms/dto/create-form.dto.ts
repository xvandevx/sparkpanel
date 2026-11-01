import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SortField } from '../../record-sort';

/** Код формы — как у остальных кодов панели: строчные латинские буквы, цифры, дефис. */
export const FORM_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFormDto {
  @ApiProperty({ example: 'feedback', description: 'Код, которым форму подключают на сайте' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FORM_CODE_PATTERN, {
    message: 'Код формы: строчные латинские буквы, цифры и дефис между ними',
  })
  code: string;

  @ApiProperty({ example: 'Обратная связь', description: 'Название для админки' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @SortField()
  sort?: number;
}
