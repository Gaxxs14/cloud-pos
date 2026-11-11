import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsBoolean, IsDateString } from 'class-validator';

export class CreateProductDto {
  @IsString({ message: 'El nombre del producto debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre del producto es requerido' })
  name: string;

  @IsString({ message: 'El código SKU/Barras debe ser un texto' })
  @IsOptional()
  skuBarcode?: string;

  @IsString({ message: 'El ID de categoría debe ser un texto' })
  @IsOptional()
  categoryId?: string;

  @IsNumber({}, { message: 'El precio de costo debe ser un número' })
  @Min(0, { message: 'El precio de costo no puede ser negativo' })
  costPrice: number;

  @IsNumber({}, { message: 'El precio de venta debe ser un número' })
  @Min(0, { message: 'El precio de venta no puede ser negativo' })
  sellPrice: number;

  @IsNumber({}, { message: 'El stock debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock?: number;

  @IsNumber({}, { message: 'El stock mínimo debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  minStock?: number;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isExempt?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  wholesalePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  wholesaleMinQty?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  unitsPerBox?: number;

  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @IsString()
  @IsOptional()
  lotNumber?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
