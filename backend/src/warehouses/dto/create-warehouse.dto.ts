import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @MinLength(2, {
    message: 'Название склада должно содержать минимум 2 символа',
  })
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;
}