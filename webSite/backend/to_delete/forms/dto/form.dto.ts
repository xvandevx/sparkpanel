import { ApiProperty } from '@nestjs/swagger';
import { FormFields } from '../form-field.model';
import { Forms } from '../forms.model';
import { FormFieldDto } from './form-field.dto';

/**
 * Форма со своими полями: админка показывает их одним деревом, и отдельный
 * запрос за полями каждой формы означал бы запрос на строку таблицы.
 */
export class FormDto {
  @ApiProperty({ example: 1, description: 'Порядковый номер формы' })
  id: number;

  @ApiProperty({ example: 100 })
  position: number;

  @ApiProperty({ example: 'feedback', description: 'Код, по которому форму подключают на сайте' })
  code: string;

  @ApiProperty({ example: 'Обратная связь' })
  name: string;

  @ApiProperty({ example: 'Ответим в течение рабочего дня', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'sales@example.com', description: 'Куда отправлять заявки' })
  notifyEmail: string;

  @ApiProperty({ example: 'Спасибо! Мы получили заявку.', nullable: true })
  successMessage: string | null;

  @ApiProperty({ example: 'Отправить' })
  submitLabel: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: [FormFieldDto], description: 'Поля формы по порядку' })
  fields: FormFieldDto[];

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  updatedAt: string;

  static from(form: Forms, fields: FormFields[] = []): FormDto {
    return {
      id: form.id,
      position: form.position,
      code: form.code,
      name: form.name,
      description: form.description ?? null,
      notifyEmail: form.notifyEmail ?? '',
      successMessage: form.successMessage ?? null,
      submitLabel: form.submitLabel ?? '',
      isActive: form.isActive,
      fields: fields.map(FormFieldDto.from),
      createdAt: toIso(form.createdAt),
      updatedAt: toIso(form.updatedAt),
    };
  }
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');
