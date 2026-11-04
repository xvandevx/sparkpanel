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
import { FileDto } from './dto/file.dto';
import { FilesQueryDto } from './dto/files-query.dto';
import { ImportFileDto } from './dto/import-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService, MAX_FILE_SIZE } from './files.service';

/**
 * Номер файла — только цифры: по тому же пути живут разделы
 * (`/infoblocks/files/sections`), и без этого «sections» уходило бы сюда номером.
 */
const ID = ':id(\\d+)';

@ApiTags('infoblock-files')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Файлы раздела; без sectionId — все, с привязками к записям' })
  @ApiOkResponse({ type: [FileDto] })
  @Get()
  findAll(@Query() query: FilesQueryDto) {
    return this.filesService.findAll(query);
  }

  @ApiOperation({ summary: 'Загрузить файл в раздел или в раздел свойства' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiOkResponse({ type: FileDto })
  @ApiBadRequestResponse({ description: 'Файл не передан, не указано куда, хранилище не приняло' })
  @ApiPayloadTooLargeResponse({ description: 'Файл больше 20 МБ' })
  @ApiNotFoundResponse({ description: 'Раздел или свойство не найдены' })
  // Хранилище multer по умолчанию — память: файл целиком уходит в хранилище,
  // временных копий на диске нет. Лимит здесь же — иначе 20-мегабайтный предел ловил бы
  // только nginx, а локальный запуск мимо него остался бы без ограничения
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @Post('upload')
  upload(
    @Body() dto: UploadFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.upload(dto, file);
  }

  @ApiOperation({ summary: 'Забрать внешний файл по адресу в хранилище — в раздел или в раздел свойства' })
  @ApiOkResponse({ type: FileDto })
  @ApiBadRequestResponse({
    description: 'Адрес не http(s) или из внутренней сети, файл не скачался или больше 20 МБ, хранилище не приняло',
  })
  @ApiNotFoundResponse({ description: 'Раздел или свойство не найдены' })
  @Post('import')
  importUrl(@Body() dto: ImportFileDto) {
    return this.filesService.importUrl(dto);
  }

  @ApiOperation({ summary: 'Поправить имя и описание файла' })
  @ApiOkResponse({ type: FileDto })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  @Patch(ID)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFileDto,
  ) {
    return this.filesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Удалить файл: записи его забудут, объект уйдёт из хранилища' })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.filesService.remove(id);
  }
}
