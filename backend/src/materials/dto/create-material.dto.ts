import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaterialDto {
  @IsString()
  @MinLength(2, {
    message: 'Код материала должен содержать минимум 2 символа',
  })
  @MaxLength(50)
  sku!: string;

  @IsString()
  @MinLength(2, {
    message: 'Название материала должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1, {
    message: 'Необходимо указать единицу измерения',
  })
  @MaxLength(30)
  unit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0, {
    message: 'Минимальный запас не может быть отрицательным',
  })
  minimumStock?: number;
}