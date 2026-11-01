import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiKey } from './api-key.model';

/** Ключ в списке: без самого ключа — его нет и в базе. */
export class ApiKeyDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Сайт farkop.ru' })
  name: string;

  @ApiProperty({ example: '3f9a', description: 'Последние символы ключа' })
  keyTail: string;

  @ApiProperty({ example: '2026-10-30T09:12:00.000Z', nullable: true, type: String, description: 'null — запросов ещё не было' })
  lastUsedAt: string | null;

  @ApiProperty({ example: '2026-10-29T15:40:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: true, description: 'Пишет ли ключ; читает он всегда' })
  isWritable: boolean;

  @ApiProperty({
    example: ['products', 'product-categories'],
    nullable: true,
    type: [String],
    description: 'Куда ключ пишет: ключи списков; null — во все списки API (или ключ только читает)',
  })
  writeLists: string[] | null;

  static from(key: ApiKey): ApiKeyDto {
    return {
      id: key.id,
      name: key.name,
      keyTail: key.keyTail,
      isWritable: key.isWritable === true,
      writeLists: key.isWritable === true ? key.writeLists ?? null : null,
      lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
      createdAt: key.createdAt.toISOString(),
    };
  }
}

/** Только что созданный ключ — единственный раз, когда он виден целиком. */
export class CreatedApiKeyDto extends ApiKeyDto {
  @ApiProperty({ example: 'sp_Xq3…3f9a', description: 'Ключ целиком; больше его не покажут' })
  key: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Сайт farkop.ru', description: 'Для кого ключ — чтобы потом знать, что отзывать' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Укажите название ключа' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: false, description: 'Право записи; по умолчанию — только чтение' })
  @IsOptional()
  @IsBoolean()
  isWritable?: boolean;

  @ApiPropertyOptional({
    example: ['products'],
    nullable: true,
    type: [String],
    description: 'Куда ключ пишет — ключи списков из `GET /external-api/lists`; null или не прислали — во все',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Отметьте списки, куда ключ может писать' })
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  writeLists?: string[] | null;
}

/** Список внешнего API — для выбора, куда ключ может писать. */
export class ApiListDto {
  @ApiProperty({ example: 'content-items.3', description: 'Ключ списка: его запоминает ключ API' })
  listKey: string;

  @ApiProperty({ example: 'Новости' })
  name: string;

  @ApiProperty({ example: 'Контент', description: 'Раздел документации: «Сайт», «Контент», «Каталог»' })
  group: string;

  @ApiProperty({ example: '/contents/news', description: 'Адрес методов списка от /api/v1' })
  path: string;
}
