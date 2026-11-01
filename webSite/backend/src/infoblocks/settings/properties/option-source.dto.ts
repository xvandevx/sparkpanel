import { ApiProperty } from '@nestjs/swagger';

/**
 * Свойство-«Список», на варианты которого может смотреть привязка к значениям
 * списка. Выбирают в настройках привязки; сами варианты подставляет чтение.
 */
export class OptionSourceDto {
  @ApiProperty({ example: 12, description: 'Номер свойства-списка' })
  propertyId: number;

  @ApiProperty({ example: 'Тип страницы', description: 'Название свойства' })
  name: string;

  @ApiProperty({ example: 'pages', description: 'Ключ списка, где свойство заведено' })
  listKey: string;

  @ApiProperty({ example: 'Страницы сайта', description: 'Имя этого списка — группа в выборе' })
  listName: string;
}
