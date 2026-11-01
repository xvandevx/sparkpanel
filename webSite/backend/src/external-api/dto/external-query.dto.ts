import { Type } from 'class-transformer';
import { Allow, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PAGE_SIZES } from '../../infoblocks/records/records-page';

/**
 * Параметры запросов внешнего API. В Swagger панели их нет: внешнее API
 * описывает своя спецификация (`openapi-spec.ts`), собранная из настроек списков.
 */

export class ExternalDomainQueryDto {
  /** Домен для мультидоменных свойств; без него — общие значения */
  @IsOptional()
  @IsString()
  @MaxLength(253)
  domain?: string;
}

export class ExternalItemQueryDto extends ExternalDomainQueryDto {
  /** Какие привязки раскрыть: коды свойств через запятую. Какие коды есть, проверяет сервис */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expand?: string;
}

export class ExternalFacetsQueryDto extends ExternalDomainQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  /**
   * `filter[код]=…` — Express разбирает скобки в объект. Проверяет его сервис:
   * какие коды есть, знают только настройки списка
   */
  @Allow()
  filter?: unknown;
}

export class ExternalItemsQueryDto extends ExternalFacetsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES as unknown as number[])
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  /** Номер родителя или `root` — записи верхнего уровня */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  parentId?: string;

  /** Как у записи: коды привязок через запятую */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expand?: string;
}

export class PageByUrlQueryDto extends ExternalDomainQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url: string;
}

export class DomainByHostQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  host: string;
}
