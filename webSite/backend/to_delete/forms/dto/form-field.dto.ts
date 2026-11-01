import { ApiProperty } from '@nestjs/swagger';
import { FormFields, FormFieldType } from '../form-field.model';

/** Поле формы в том виде, в каком его показывает админка. */
export class FormFieldDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер поля' })
  id: number;

  @ApiProperty({ example: 1, description: 'Форма, которой принадлежит поле' })
  formId: number;

  @ApiProperty({ example: 100 })
  position: number;

  @ApiProperty({ example: 'phone', description: 'Ключ значения в заявке' })
  code: string;

  @ApiProperty({ example: 'Телефон' })
  label: string;

  @ApiProperty({ enum: FormFieldType, example: FormFieldType.Text })
  type: FormFieldType;

  @ApiProperty({ example: '+7 (900) 000-00-00', nullable: true })
  placeholder: string | null;

  @ApiProperty({ example: ['Консультация', 'Заказ'], description: 'Варианты списка' })
  options: string[];

  @ApiProperty({ example: true })
  isRequired: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  static from(field: FormFields): FormFieldDto {
    return {
      id: field.id,
      formId: field.formId,
      position: field.position,
      code: field.code,
      label: field.label,
      type: field.type,
      placeholder: field.placeholder ?? null,
      options: field.options ?? [],
      isRequired: field.isRequired,
      isActive: field.isActive,
    };
  }
}
