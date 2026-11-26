import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EquipmentStatus } from '@prisma/client';

export class CreateEquipmentDto {
  @IsString()
  @MinLength(2, {
    message: 'Инвентарный номер должен содержать минимум 2 символа',
  })
  @MaxLength(50)
  inventoryNumber!: string;

  @IsString()
  @MinLength(2, {
    message: 'Название оборудования должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(2, {
    message: 'Тип оборудования должен содержать минимум 2 символа',
  })
  @MaxLength(120)
  type!: string;

  @IsUUID()
  departmentId!: string;

  @IsOptional()
  @IsEnum(EquipmentStatus, {
    message: 'Указан недопустимый статус оборудования',
  })
  status?: EquipmentStatus;

  @IsOptional()
  @IsDateString()
  commissionedAt?: string | null;
}