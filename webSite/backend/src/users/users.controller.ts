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
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { HistoryQueryDto } from '../infoblocks/history/dto/history-query.dto';
import { HistoryPageDto, HistoryRecordDto } from '../infoblocks/history/dto/history.dto';
import { historyAuthor } from '../infoblocks/history/history-author';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { AccountActor, UsersService } from './users.service';

/**
 * Раздел «Пользователи»: учётные записи панели.
 *
 * Удалить можно любого, кроме главного администратора: он один и приходит
 * с `isBlocked`. Забрать доступ, не удаляя, — выключатель `isActive`: такой
 * пользователь не проходит ни login, ни `/auth/me`.
 */
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Все учётные записи панели' })
  @ApiOkResponse({ type: [UserDto] })
  @Get()
  async findAll(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    return users.map(UserDto.from);
  }

  // Объявлено до `:id`: иначе Nest примет «history» за идентификатор пользователя.
  @ApiOperation({ summary: 'Общий журнал изменений раздела «Пользователи»' })
  @ApiOkResponse({ type: HistoryPageDto })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @Get('history')
  async findJournal(@Req() req: Request, @Query() query: HistoryQueryDto): Promise<HistoryPageDto> {
    const { rows, count } = await this.usersService.findJournal(
      actor(req),
      query.limit,
      query.offset,
    );
    return { items: rows.map(HistoryRecordDto.from), total: count };
  }

  @ApiOperation({ summary: 'Одна учётная запись' })
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return UserDto.from(await this.usersService.findOne(id));
  }

  @ApiOperation({ summary: 'История изменений одной учётной записи' })
  @ApiOkResponse({ type: [HistoryRecordDto] })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @Get(':id/history')
  async findHistory(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<HistoryRecordDto[]> {
    const records = await this.usersService.findHistory(actor(req), id);
    return records.map(HistoryRecordDto.from);
  }

  @ApiOperation({ summary: 'Завести учётную запись (всегда с ролью «пользователь»)' })
  @ApiOkResponse({ type: UserDto })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @ApiConflictResponse({ description: 'Пользователь с таким email уже есть' })
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateUserDto): Promise<UserDto> {
    const user = await this.usersService.createAccount(actor(req), dto, historyAuthor(req));
    return UserDto.from(user);
  }

  @ApiOperation({ summary: 'Изменить учётную запись; пустой пароль означает «оставить прежний»' })
  @ApiOkResponse({ type: UserDto })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @ApiConflictResponse({ description: 'Такой email занят или это попытка отключить root' })
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    const user = await this.usersService.updateAccount(actor(req), id, dto, historyAuthor(req));
    return UserDto.from(user);
  }

  @ApiOperation({ summary: 'Удалить учётную запись; главного администратора удалить нельзя' })
  @ApiNoContentResponse({ description: 'Учётная запись удалена' })
  @ApiForbiddenResponse({ description: 'Доступно только главному администратору' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @ApiConflictResponse({ description: 'Это главный администратор' })
  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usersService.removeAccount(actor(req), id, historyAuthor(req));
  }
}

/** Кто выполняет действие — из JWT (его положил AuthGuard), НИКОГДА из тела запроса. */
const actor = (req: Request): AccountActor => ({ id: req.user.id, isRoot: req.user.isRoot });
