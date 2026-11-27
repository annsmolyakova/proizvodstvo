import {
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProductDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Код продукции должен содержать минимум 2 символа',
  })
  @MaxLength(50)
  sku?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Название продукции должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  name?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1, {
    message: 'Необходимо указать единицу измерения',
  })
  @MaxLength(30)
  unit?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  category?: string | null;
}