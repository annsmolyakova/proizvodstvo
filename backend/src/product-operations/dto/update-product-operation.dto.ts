import {
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProductOperationDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2, {
    message: 'Название операции должно содержать минимум 2 символа',
  })
  @MaxLength(200)
  name?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt({
    message: 'Номер операции должен быть целым числом',
  })
  @Min(1, {
    message: 'Номер операции должен быть больше нуля',
  })
  sequenceNumber?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt({
    message: 'Длительность должна быть целым числом',
  })
  @Min(1, {
    message: 'Длительность должна быть больше нуля',
  })
  plannedDurationMinutes?: number | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}