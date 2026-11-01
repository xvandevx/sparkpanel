import { PartialType } from '@nestjs/swagger';
import { CreateProductCategoryDto } from './create-product-category.dto';

/** Правка категории: присылают только то, что меняется; `parentId: null` — перенос в корень. */
export class UpdateProductCategoryDto extends PartialType(CreateProductCategoryDto) {}
