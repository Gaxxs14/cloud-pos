import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString({ message: 'El nombre de la tienda debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre de la tienda es requerido' })
  tenantName: string;

  @IsString({ message: 'El slug/subdominio debe ser un texto' })
  @IsNotEmpty({ message: 'El slug es requerido' })
  slug: string;

  @IsString({ message: 'El nombre del administrador es requerido' })
  @IsNotEmpty({ message: 'El nombre del administrador es requerido' })
  adminName: string;

  @IsEmail({}, { message: 'El correo electrónico del administrador no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  adminEmail: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  adminPassword: string;
}
