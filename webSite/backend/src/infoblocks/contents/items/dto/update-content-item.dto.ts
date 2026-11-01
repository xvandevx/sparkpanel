import { PartialType } from '@nestjs/swagger';
import { CreateContentItemDto } from './create-content-item.dto';

/** Правка элемента: присылают только то, что меняется; `parentId: null` — перенос в корень. */
export class UpdateContentItemDto extends PartialType(CreateContentItemDto) {}
