import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateWarehouseDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Название склада должно содержать минимум 2 символа',
  })
  @MaxLength(150)
  name?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(300)
  location?: string | null;
}