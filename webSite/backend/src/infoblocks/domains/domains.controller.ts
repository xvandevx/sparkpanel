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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateDomainDto } from './dto/create-domain.dto';
import { DomainDto } from './dto/domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { DomainsService } from './domains.service';

/**
 * Номер домена — только цифры: по тому же пути живут значения свойств
 * списка (`/infoblocks/domains/values`), и без этого «values» уходило бы
 * сюда номером.
 */
const ID = ':id(\\d+)';

/**
 * Домены сайта — дерево редактора контента в «Настройках» → «Домены».
 * Общие на сайт, как и настройки: владельца нет, маршруты закрыты, как и все.
 */
@ApiTags('infoblock-domains')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @ApiOperation({
    summary: 'Домены и поддомены плоским списком (дерево собирает фронт), с полными адресами',
  })
  @ApiOkResponse({ type: [DomainDto] })
  @Get()
  findAll(): Promise<DomainDto[]> {
    return this.domainsService.findAll();
  }

  @ApiOperation({
    summary: 'Добавить домен; с parentId — поддомен, у него указывается только его имя',
  })
  @ApiOkResponse({ type: DomainDto })
  @ApiBadRequestResponse({ description: 'Неверное имя или глубже предела вложенности' })
  @ApiNotFoundResponse({ description: 'Родительский домен не найден' })
  @ApiConflictResponse({ description: 'Домен с таким адресом уже есть' })
  @Post()
  create(@Body() dto: CreateDomainDto): Promise<DomainDto> {
    return this.domainsService.create(dto);
  }

  @ApiOperation({
    summary: 'Изменить или перенести домен; адреса его поддоменов складываются заново',
  })
  @ApiOkResponse({ type: DomainDto })
  @ApiBadRequestResponse({ description: 'Неверное имя, перенос в свою ветку или глубже предела' })
  @ApiNotFoundResponse({ description: 'Домен не найден' })
  @ApiConflictResponse({ description: 'Адрес совпал бы с адресом другого домена' })
  @Patch(ID)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDomainDto,
  ): Promise<DomainDto> {
    return this.domainsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Удалить домен без поддоменов' })
  @ApiNotFoundResponse({ description: 'Домен не найден' })
  @ApiConflictResponse({ description: 'У домена есть поддомены' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.domainsService.remove(id);
  }
}
