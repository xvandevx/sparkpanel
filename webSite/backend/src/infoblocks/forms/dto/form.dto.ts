import { ApiProperty } from '@nestjs/swagger';
import { Forms } from '../forms.model';

/**
 * Форма в том виде, в каком её показывает админка. Полей здесь нет: это
 * значение системного свойства «Поля», оно приходит со значениями свойств списка.
 */
export class FormDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'feedback' })
  code: string;

  @ApiProperty({ example: 'Обратная связь' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({
    example: false,
    description: 'Форму выбрали в привязке к контенту другой записи — удалить нельзя',
  })
  isBlocked: boolean;

  @ApiProperty({ example: '2026-10-12T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-12T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  static from(form: Forms, isLinked: boolean): FormDto {
    return {
      id: form.id,
      code: form.code,
      name: form.name,
      isActive: form.isActive,
      sort: form.sort,
      isBlocked: isLinked,
      createdAt: toIso(form.createdAt),
      updatedAt: toIso(form.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
