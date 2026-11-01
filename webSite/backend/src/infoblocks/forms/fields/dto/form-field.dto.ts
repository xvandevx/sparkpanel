import { ApiProperty } from '@nestjs/swagger';
import { FormFields } from '../form-fields.model';

/**
 * Поле формы в том виде, в каком его показывает админка. Плейсхолдера здесь
 * нет: это значение системного свойства, оно приходит со значениями свойств списка.
 */
export class FormFieldDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'phone' })
  code: string;

  @ApiProperty({ example: 'Телефон' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 500 })
  sort: number;

  @ApiProperty({
    example: false,
    description: 'Поле подключено хотя бы к одной форме — удалить нельзя',
  })
  isBlocked: boolean;

  @ApiProperty({ example: '2026-10-12T10:00:00.000Z' })
  createdAt: string;


  @ApiProperty({ example: '2026-10-12T10:00:00.000Z', description: 'Когда запись или значения её свойств правили последний раз' })

  updatedAt: string;

  static from(field: FormFields, isLinked: boolean): FormFieldDto {
    return {
      id: field.id,
      code: field.code,
      name: field.name,
      isActive: field.isActive,
      sort: field.sort,
      isBlocked: isLinked,
      createdAt: toIso(field.createdAt),
      updatedAt: toIso(field.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
