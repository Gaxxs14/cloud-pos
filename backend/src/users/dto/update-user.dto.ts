import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsOptional()
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password?: string;

  @IsEnum(Role, { message: 'El rol debe ser OWNER, MANAGER o CASHIER' })
  @IsOptional()
  role?: Role;

  @IsString({ message: 'El ID de la sucursal debe ser un texto' })
  @IsOptional()
  branchId?: string;
}
