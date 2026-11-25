
import {
  IsBoolean,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateEmployeeDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Табельный номер должен содержать минимум 2 символа',
  })
  @MaxLength(50)
  personnelNumber?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'ФИО должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  fullName?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Название должности должно содержать минимум 2 символа',
  })
  @MaxLength(120)
  position?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  departmentId?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  userId?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
