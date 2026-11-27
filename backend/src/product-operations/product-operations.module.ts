import { Module } from '@nestjs/common';
import { ProductOperationsController } from './product-operations.controller.js';
import { ProductOperationsService } from './product-operations.service.js';

@Module({
  controllers: [ProductOperationsController],
  providers: [ProductOperationsService],
})
export class ProductOperationsModule {}