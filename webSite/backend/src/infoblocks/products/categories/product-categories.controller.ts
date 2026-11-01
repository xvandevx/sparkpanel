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
import { historyAuthor } from '../../history/history-author';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategoryDto } from './dto/product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

/**
 * Номер категории — только цифры: правило общее для маршрутов списков редактора,
 * рядом с ними живут значения свойств (`/infoblocks/:listKey/values`).
 */
const ID = ':id(\\d+)';

/**
 * Категории товаров — дерево редактора контента. Журнал — общий маршрут
 * `/api/infoblocks/history/product-categories`.
 */
@ApiTags('product-categories')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/products/categories')
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @ApiOperation({
    summary: 'Категории товаров плоским списком (дерево собирает фронт)',
  })
  @ApiOkResponse({ type: [ProductCategoryDto] })
  @Get()
  findAll(): Promise<ProductCategoryDto[]> {
    return this.categoriesService.findAll();
  }

  @ApiOperation({
    summary: 'Завести категорию; без parentId она встанет в корень',
  })
  @ApiOkResponse({ type: ProductCategoryDto })
  @ApiBadRequestResponse({ description: 'Глубже предела вложенности' })
  @ApiNotFoundResponse({ description: 'Родитель не найден' })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateProductCategoryDto): Promise<ProductCategoryDto> {
    return this.categoriesService.create(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({
    summary: 'Изменить или перенести категорию; parentId: null — в корень',
  })
  @ApiOkResponse({ type: ProductCategoryDto })
  @ApiBadRequestResponse({
    description: 'Перенос внутрь собственной ветки или глубже предела',
  })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryDto> {
    return this.categoriesService.update(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить пустую категорию' })
  @ApiNotFoundResponse({ description: 'Категория не найдена' })
  @ApiConflictResponse({
    description: 'К категории привязаны товары или в ней есть вложенные',
  })
  @HttpCode(204)
  @Delete(ID)
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoriesService.remove(req.user.id, id, historyAuthor(req));
  }
}
