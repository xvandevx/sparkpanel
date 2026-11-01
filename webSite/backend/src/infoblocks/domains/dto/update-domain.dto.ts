import { PartialType } from '@nestjs/swagger';
import { CreateDomainDto } from './create-domain.dto';

/** Правка домена: присылают только то, что меняется; `parentId: null` — вынести в корень. */
export class UpdateDomainDto extends PartialType(CreateDomainDto) {}
