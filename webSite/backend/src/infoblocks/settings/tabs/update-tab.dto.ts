import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Переименование вкладки. Код не меняется: на него ссылаются свойства, и
 * менять его значило бы оторвать их от вкладки.
 */
export class UpdateInfoblockTabDto {
  @ApiProperty({ example: 'Доставка и оплата' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
