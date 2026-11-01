import { ApiProperty } from '@nestjs/swagger';

/**
 * Список, к записям которого может вести «Привязка к записям контента»: страницы,
 * элементы одного типа контента, роли, категории товаров, формы обратной связи
 * и их поля. Типы контента — деревом в группе «Контент». Выбирается в настройках
 * свойства; саму запись выбирают уже в карточке.
 *
 * Инфоблок попадает сюда, даже если записей в нём ещё нет: свойство настраивают
 * раньше, чем наполняют список.
 */
export class LinkSourceDto {
  @ApiProperty({ example: 'infoblock-elements.3', description: 'Ключ списка' })
  listKey: string;

  @ApiProperty({
    example: 11,
    nullable: true,
    type: Number,
    description: 'Номер записи, под которую заведён список (тип контента); null — у постоянных списков',
  })
  id: number | null;

  @ApiProperty({ example: 'Уникальные описания товаров', description: 'Название списка в выборе' })
  name: string;

  @ApiProperty({
    example: 'Контент: SEO / Уникальные описания товаров',
    required: false,
    description: 'Полное имя, когда одного названия мало: у вложенного типа контента — путь',
  })
  label?: string;

  @ApiProperty({
    example: 'Контент',
    nullable: true,
    type: String,
    description: 'Группа в выборе: «Контент» у типов контента; null — без группы',
  })
  group: string | null;

  @ApiProperty({
    example: 'content-items.10',
    nullable: true,
    type: String,
    description: 'Ключ родительского источника в дереве группы; null — верхний уровень',
  })
  parentKey: string | null;
}
