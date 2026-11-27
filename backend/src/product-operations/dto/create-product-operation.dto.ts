import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductOperationDto {
  @IsUUID('4')
  productId!: string;

  @IsString()
  @MinLength(2, {
    message: 'Название операции должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  name!: string;

  @IsInt({
    message: 'Номер операции должен быть целым числом',
  })
  @Min(1, {
    message: 'Номер операции должен быть больше нуля',
  })
  sequenceNumber!: number;

  @IsOptional()
  @IsInt({
    message: 'Длительность должна быть целым числом',
  })
  @Min(1, {
    message: 'Длительность должна быть больше нуля',
  })
  plannedDurationMinutes?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}