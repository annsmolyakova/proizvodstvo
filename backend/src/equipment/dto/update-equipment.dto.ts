import {
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EquipmentStatus } from '@prisma/client';

export class UpdateEquipmentDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Инвентарный номер должен содержать минимум 2 символа',
  })
  @MaxLength(50)
  inventoryNumber?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Название оборудования должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  name?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Тип оборудования должен содержать минимум 2 символа',
  })
  @MaxLength(120)
  type?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  departmentId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(EquipmentStatus, {
    message: 'Указан недопустимый статус оборудования',
  })
  status?: EquipmentStatus;

  @ValidateIf((_, value) => value !== undefined)
  @IsDateString()
  commissionedAt?: string | null;
}