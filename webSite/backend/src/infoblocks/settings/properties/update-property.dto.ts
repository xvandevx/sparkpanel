import { ApiProperty, PartialType } from '@nestjs/swagger';
import { InfoblockPropertyDto } from './property.dto';

/**
 * Правка одного свойства: присылают только то, что меняется. Код меняется без
 * потерь — значения привязаны к номеру свойства. Тип — пока свойство нигде
 * не заполнено, а у заполненного только между строкой, текстом и HTML;
 * иначе сервер ответит 409.
 */
export class UpdateInfoblockPropertyDto extends PartialType(InfoblockPropertyDto) {
  @ApiProperty({ example: 'Цена', required: false })
  name?: string;
}
