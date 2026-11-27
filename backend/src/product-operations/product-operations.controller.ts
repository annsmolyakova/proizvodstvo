import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProductOperationsService } from './product-operations.service.js';
import { CreateProductOperationDto } from './dto/create-product-operation.dto.js';
import { UpdateProductOperationDto } from './dto/update-product-operation.dto.js';

@Controller('api/product-operations')
export class ProductOperationsController {
  constructor(
    private readonly productOperationsService: ProductOperationsService,
  ) {}

  @Get()
  findAll(@Query('productId') productId?: string) {
    return this.productOperationsService.findAll(productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productOperationsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductOperationDto) {
    return this.productOperationsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductOperationDto,
  ) {
    return this.productOperationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productOperationsService.remove(id);
  }
}