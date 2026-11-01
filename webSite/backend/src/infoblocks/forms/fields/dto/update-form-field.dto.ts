import { PartialType } from '@nestjs/swagger';
import { CreateFormFieldDto } from './create-form-field.dto';

/** Правка поля: присылают только то, что меняется. */
export class UpdateFormFieldDto extends PartialType(CreateFormFieldDto) {}
