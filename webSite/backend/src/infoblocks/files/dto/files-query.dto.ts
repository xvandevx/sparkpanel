import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

/** Файлы одного раздела или свойства; без них — все файлы (их читает выбор файла в карточке записи). */
export class FilesQueryDto {
  @ApiPropertyOptional({ example: 10, description: 'Раздел файлов' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectionId?: number;

  @ApiPropertyOptional({ example: 6, description: 'Свойство, через которое загружены файлы' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;
}
