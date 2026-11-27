import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2, {
    message: 'Код продукции должен содержать минимум 2 символа',
  })
  @MaxLength(50)
  sku!: string;

  @IsString()
  @MinLength(2, {
    message: 'Название продукции должно содержать минимум 2 символа',
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
  @IsString()
  @MaxLength(100)
  category?: string | null;
}