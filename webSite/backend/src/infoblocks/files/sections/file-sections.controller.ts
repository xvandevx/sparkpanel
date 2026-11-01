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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CreateFileSectionDto } from './dto/create-file-section.dto';
import { FileSectionDto } from './dto/file-section.dto';
import { UpdateFileSectionDto } from './dto/update-file-section.dto';
import { FileSectionsService } from './file-sections.service';

/**
 * Номер раздела — только цифры: правило общее для маршрутов списков редактора,
 * рядом с ними живут значения свойств (`/infoblocks/:listKey/values`).
 */
const ID = ':id(\\d+)';

@ApiTags('file-sections')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/files/sections')
export class FileSectionsController {
  constructor(private readonly sectionsService: FileSectionsService) {}

  @ApiOperation({ summary: 'Разделы файлов плоским списком (дерево собирает фронт)' })
  @ApiOkResponse({ type: [FileSectionDto] })
  @Get()
  findAll() {
    return this.sectionsService.findAll();
  }

  @ApiOperation({ summary: 'Создать раздел; без parentId он встанет в корень' })
  @ApiOkResponse({ type: FileSectionDto })
  @ApiNotFoundResponse({ description: 'Родитель не найден' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateFileSectionDto) {
    return this.sectionsService.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Переименовать или перенести раздел; parentId: null — в корень' })
  @ApiOkResponse({ type: FileSectionDto })
  @ApiBadRequestResponse({ description: 'Перенос внутрь собственной ветки' })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  @Patch(ID)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFileSectionDto,
  ) {
    return this.sectionsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Удалить пустой раздел' })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  @ApiConflictResponse({ description: 'Раздел свойства, или в нём есть файлы или разделы' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.sectionsService.remove(id);
  }
}
