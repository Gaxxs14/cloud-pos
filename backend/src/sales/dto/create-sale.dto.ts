import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class SaleItemDto {
  @IsString({ message: 'El ID del producto debe ser un texto' })
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  productId: string;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0.01, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @IsNumber({}, { message: 'El precio unitario debe ser un número' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  unitPrice: number;

  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  discount?: number;
}

export class CreateSaleDto {
  @IsString({ message: 'El ID del cliente debe ser un texto' })
  @IsOptional()
  customerId?: string;

  @IsString({ message: 'El ID del almacén debe ser un texto' })
  @IsOptional()
  warehouseId?: string;

  @IsNumber({}, { message: 'El total de la venta debe ser un número' })
  @Min(0, { message: 'El total no puede ser negativo' })
  totalAmount: number;

  @IsNumber({}, { message: 'El total de impuestos debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El total de impuestos no puede ser negativo' })
  taxAmount?: number;

  @IsNumber({}, { message: 'El IGTF debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El IGTF no puede ser negativo' })
  igtfAmount?: number;

  @IsNumber({}, { message: 'La tasa de IGTF debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'La tasa de IGTF no puede ser negativa' })
  igtfRate?: number;

  @IsNumber({}, { message: 'El descuento total debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  discountAmount?: number;

  @IsEnum(PaymentMethod, { message: 'El método de pago no es válido' })
  paymentMethod: PaymentMethod;

  @IsArray({ message: 'Los artículos vendidos deben estar en una lista' })
  @IsNotEmpty({ message: 'La lista de artículos no puede estar vacía' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}
