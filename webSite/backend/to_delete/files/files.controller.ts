import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FileDto } from './dto/file.dto';
import { FilesQueryDto } from './dto/files-query.dto';
import { RemovedDto } from './dto/removed.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService, MAX_FILE_SIZE } from './files.service';

@ApiTags('files')
@ApiBearerAuth('JWT-auth')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Файлы раздела; без sectionId — вся медиатека' })
  @ApiOkResponse({ type: [FileDto] })
  @Get()
  findAll(@Req() req: Request, @Query() query: FilesQueryDto) {
    // userId — из токена, не из запроса: файлы всех пользователей в одной таблице
    return this.filesService.findAll(req.user.id, query.sectionId);
  }

  @ApiOperation({ summary: 'Загрузить файл в раздел' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiOkResponse({ type: FileDto })
  @ApiBadRequestResponse({ description: 'Файл не передан или раздел указан неверно' })
  @ApiPayloadTooLargeResponse({ description: 'Файл больше 20 МБ' })
  @ApiNotFoundResponse({ description: 'Раздел не найден' })
  // Хранилище multer по умолчанию — память: файл уходит в S3 целиком и на диск
  // бэкенда не попадает. Лимит здесь же — иначе 20-мегабайтный предел ловил бы
  // только nginx, а локальный запуск мимо него остался бы без ограничения.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @Post('upload')
  upload(
    @Req() req: Request,
    @Body() dto: UploadFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.upload(req.user.id, dto, file);
  }

  @ApiOperation({ summary: 'Изменить описание файла или перенести его в другой раздел' })
  @ApiOkResponse({ type: FileDto })
  @ApiNotFoundResponse({ description: 'Файл или раздел не найден' })
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFileDto,
  ) {
    return this.filesService.update(req.user.id, id, dto);
  }

  @ApiOperation({ summary: 'Удалить файл вместе с объектом в хранилище' })
  @ApiOkResponse({ type: RemovedDto })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<RemovedDto> {
    return { id: await this.filesService.remove(req.user.id, id) };
  }
}
