import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { historyAuthor } from '../history/history-author';
import { AccountActor } from '../../users/users.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleDto } from './dto/role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

/**
 * Номер роли — только цифры: по тому же пути живут значения свойств списка
 * (`/infoblocks/roles/values`), и без этого «values» уходило бы сюда номером.
 */
const ID = ':id(\\d+)';

/**
 * Роли пользователей — список редактора контента. Общие на панель, как
 * и учётные записи: читают все, правит только главный администратор.
 * Журнал — общий маршрут `/api/infoblocks/history/roles`.
 */
@ApiTags('infoblock-roles')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'Все роли пользователей' })
  @ApiOkResponse({ type: [RoleDto] })
  @Get()
  findAll(): Promise<RoleDto[]> {
    return this.rolesService.findAll();
  }

  @ApiOperation({ summary: 'Завести роль' })
  @ApiOkResponse({ type: RoleDto })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @ApiConflictResponse({ description: 'Роль с таким кодом уже есть' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateRoleDto): Promise<RoleDto> {
    return this.rolesService.create(actor(req), dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить роль' })
  @ApiOkResponse({ type: RoleDto })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @ApiNotFoundResponse({ description: 'Роль не найдена' })
  @ApiConflictResponse({ description: 'Роль с таким кодом уже есть' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDto> {
    return this.rolesService.update(actor(req), id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить роль, которую никому не назначили' })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @ApiNotFoundResponse({ description: 'Роль не найдена' })
  @ApiConflictResponse({ description: 'Роль назначена пользователям' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.rolesService.remove(actor(req), id, historyAuthor(req));
  }
}

/** Кто выполняет действие — из JWT (его положил AuthGuard), НИКОГДА из тела запроса. */
const actor = (req: Request): AccountActor => ({ id: req.user.id, isRoot: req.user.isRoot });
