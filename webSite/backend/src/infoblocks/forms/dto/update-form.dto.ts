import { PartialType } from '@nestjs/swagger';
import { CreateFormDto } from './create-form.dto';

/** Правка формы: присылают только то, что меняется. */
export class UpdateFormDto extends PartialType(CreateFormDto) {}
