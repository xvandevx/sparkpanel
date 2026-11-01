import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/** Правка товара: присылают только то, что меняется. */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
