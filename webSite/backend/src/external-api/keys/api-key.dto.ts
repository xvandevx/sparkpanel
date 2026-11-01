import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
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

  static from(key: ApiKey): ApiKeyDto {
    return {
      id: key.id,
      name: key.name,
      keyTail: key.keyTail,
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
}
