import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto.js';

@Controller('api/inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  @Get('balances')
  findBalances(
    @Query('warehouseId') warehouseId?: string,
    @Query('materialId') materialId?: string,
  ) {
    return this.inventoryService.findBalances(
      warehouseId,
      materialId,
    );
  }

  @Get('transactions')
  findTransactions(
    @Query('warehouseId') warehouseId?: string,
    @Query('materialId') materialId?: string,
    @Query('transactionType') transactionType?: string,
  ) {
    return this.inventoryService.findTransactions(
      warehouseId,
      materialId,
      transactionType,
    );
  }

  @Post('transactions')
  createTransaction(
    @Body() dto: CreateInventoryTransactionDto,
  ) {
    return this.inventoryService.createTransaction(dto);
  }
}