import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BATCH_LIMIT } from '../api-lists';

/**
 * Тела записи во внешнее API. Что внутри `fields` и `properties`, проверяют
 * не они, а сервис и маршруты панели: поля и свойства у каждого списка свои,
 * их знают только его настройки.
 */

export class ExternalWriteDto {
  /** Поля записи: name, code, isActive, sort, parentId / parentExternalId, externalId */
  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;

  /** Свойства по кодам; null стирает значение, неприсланные не трогаются */
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class ExternalBatchItemDto extends ExternalWriteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalId: string;
}

export class ExternalBatchDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Пакет пустой' })
  @ArrayMaxSize(BATCH_LIMIT, { message: `В пакете не больше ${BATCH_LIMIT} записей` })
  @ValidateNested({ each: true })
  @Type(() => ExternalBatchItemDto)
  items: ExternalBatchItemDto[];
}
