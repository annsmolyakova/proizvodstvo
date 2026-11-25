
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2, {
    message: 'Табельный номер должен содержать минимум 2 символа',
  })
  @MaxLength(50)
  personnelNumber!: string;

  @IsString()
  @MinLength(2, {
    message: 'ФИО должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  fullName!: string;

  @IsString()
  @MinLength(2, {
    message: 'Название должности должно содержать минимум 2 символа',
  })
  @MaxLength(120)
  position!: string;

  @IsUUID()
  departmentId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
