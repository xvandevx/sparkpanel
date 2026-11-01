import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/** Правка роли: присылают только то, что меняется. */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
