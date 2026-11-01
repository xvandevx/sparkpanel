import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DOMAIN_NAME_MESSAGE, DOMAIN_NAME_PATTERN, normalizeDomainName } from '../domain-name';
import { SortField } from '../../record-sort';

export class CreateDomainDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Домен, к которому привязан поддомен; не указан или null — это сам домен',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @ApiProperty({
    example: 'ekb',
    description:
      'Имя хоста; протокол и путь отбрасываются. У поддомена — только его часть: ekb, а не ekb.farkop.ru',
  })
  @Transform(({ value }) => normalizeDomainName(value))
  @IsString()
  @IsNotEmpty({ message: 'Укажите домен' })
  @MaxLength(255)
  @Matches(DOMAIN_NAME_PATTERN, { message: DOMAIN_NAME_MESSAGE })
  name: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @SortField()
  sort?: number;
}
