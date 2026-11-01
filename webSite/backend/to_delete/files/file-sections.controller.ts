import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
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
import { RemovedDto } from './dto/removed.dto';
import { UpdateFileSectionDto } from './dto/update-file-section.dto';
import { FileSectionsService } from './file-sections.service';

@ApiTags('file-sections')
@ApiBearerAuth('JWT-auth')
@Controller('file-sections')
export class FileSectionsController {
  constructor(private readonly sectionsService: FileSectionsService) {}

  @ApiOperation({ summary: 'Разделы медиатеки со счётчиком файлов' })
  @ApiOkResponse({ type: [FileSectionDto] })
  @Get()
  findAll(@Req() req: Request) {
    // userId — из токена, не из запроса: разделы всех пользователей в одной таблице
    return this.sectionsService.findAll(req.user.id);
  }

  @ApiOperation({ summary: 'Создать раздел медиатеки' })
  @ApiOkResponse({ type: FileSectionDto })
  @ApiConflictResponse({ description: 'Раздел с таким кодом уже есть' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateFileSectionDto) {
    return this.sectionsService.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Изменить раздел медиатеки' })
  @ApiOkResponse({ type: FileSectionDto })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  @ApiConflictResponse({ description: 'Раздел с таким кодом уже есть' })
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFileSectionDto,
  ) {
    return this.sectionsService.update(req.user.id, id, dto);
  }

  @ApiOperation({ summary: 'Удалить пустой раздел медиатеки' })
  @ApiOkResponse({ type: RemovedDto })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  @ApiConflictResponse({ description: 'В разделе есть файлы' })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<RemovedDto> {
    return { id: await this.sectionsService.remove(req.user.id, id) };
  }
}
