import { PartialType } from '@nestjs/swagger';
import { CreateContentDto } from './create-content.dto';

/** Правка типа: присылают только то, что меняется; `parentId: null` — перенос в корень. */
export class UpdateContentDto extends PartialType(CreateContentDto) {}
