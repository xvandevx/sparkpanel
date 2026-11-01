import { ApiProperty } from '@nestjs/swagger';
import { RecordDraftDto } from '../../drafts/dto/record-draft.dto';
import { RecordValuesDto } from '../../values/property-values.dto';

/**
 * Страница записей списка. Запись — в том виде, в каком её отдаёт раздел
 * своим `GET`-маршрутом (`PageDto`, `ProductDto`, …): форма у списков разная,
 * поэтому здесь она — объект.
 */
export class RecordsPageDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Записи страницы; у дерева — записи верхнего уровня, за каждой её ветка',
  })
  items: Record<string, unknown>[];

  @ApiProperty({
    example: 135,
    description: 'Сколько всего: у дерева — записей верхнего уровня, иначе — записей',
  })
  total: number;

  @ApiProperty({
    type: [RecordValuesDto],
    description: 'Значения свойств записей страницы; запись без значений не перечислена',
  })
  values: RecordValuesDto[];

  @ApiProperty({
    type: [RecordDraftDto],
    description:
      'Черновики записей страницы; запись без черновика не перечислена. Записи и значения выше — опубликованные: ' +
      'черновик накладывает карточка, а ищет и сортирует сервер уже с ним',
  })
  drafts: RecordDraftDto[];

  @ApiProperty({ example: 3, description: 'Черновиков во всём списке — для вида «Черновики»' })
  draftsCount: number;
}
