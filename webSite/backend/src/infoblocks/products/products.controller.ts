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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { historyAuthor } from '../history/history-author';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

/**
 * Номер товара — только цифры: по тому же пути живут значения свойств списка
 * (`/infoblocks/products/values`) и категории (`/infoblocks/products/categories`).
 */
const ID = ':id(\\d+)';

/**
 * Товары — список редактора контента. Журнал — общий маршрут
 * `/api/infoblocks/history/products`.
 */
@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@Controller('infoblocks/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Все товары пользователя' })
  @ApiOkResponse({ type: [ProductDto] })
  @Get()
  findAll(): Promise<ProductDto[]> {
    return this.productsService.findAll();
  }

  @ApiOperation({ summary: 'Завести товар' })
  @ApiOkResponse({ type: ProductDto })
  @Post()
  create(@Req() req: Request, @Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.productsService.create(req.user.id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Изменить товар' })
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  @Patch(ID)
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.productsService.update(req.user.id, id, dto, historyAuthor(req));
  }

  @ApiOperation({ summary: 'Удалить товар вместе со значениями его свойств' })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  @HttpCode(204)
  @Delete(ID)
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productsService.remove(req.user.id, id, historyAuthor(req));
  }
}
