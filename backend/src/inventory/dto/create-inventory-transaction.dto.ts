import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  NotEquals,
} from 'class-validator';
import { InventoryTransactionType } from '@prisma/client';

export class CreateInventoryTransactionDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  materialId!: string;

  @IsEnum(InventoryTransactionType)
  transactionType!: InventoryTransactionType;

  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 3,
    allowNaN: false,
    allowInfinity: false,
  })
  @NotEquals(0)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  productionOrderId?: string;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment?: string;
}