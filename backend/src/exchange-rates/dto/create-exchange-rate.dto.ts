import {
  IsDecimal,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExchangeRateDto {
  @IsNumber({}, { message: 'La tasa USD→Bs debe ser un número' })
  @Min(0.0001, { message: 'La tasa debe ser mayor a 0' })
  usdToBs: number;

  @IsString()
  @IsOptional()
  @IsIn(['BCV', 'PARALELO', 'MANUAL'])
  source?: string;
}
