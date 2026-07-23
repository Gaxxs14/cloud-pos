import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  fromWarehouseId: string;

  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}
