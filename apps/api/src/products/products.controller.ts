import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { PRODUCT_OPTIONS } from './product-options';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const product = this.productsService.findOne(id);

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return { ...product, options: PRODUCT_OPTIONS };
  }
}
