import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });
    if (existingTenant) {
      throw new ConflictException('El slug/subdominio de esta tienda ya está registrado');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('Este correo electrónico ya está registrado por un usuario');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.adminPassword, salt);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.slug.toLowerCase(),
          plan: 'basic',
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Sucursal Principal',
          address: 'Sede Principal',
          isActive: true,
        },
      });

      await tx.warehouse.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: 'Bodega Principal',
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: dto.adminName,
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          role: Role.OWNER,
        },
      });

      const token = this.generateToken(user.id, user.email, user.role, tenant.id);

      return {
        message: 'Tienda registrada exitosamente',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      };
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('El acceso a esta tienda está suspendido');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const token = this.generateToken(user.id, user.email, user.role, user.tenantId);

    return {
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
    };
  }

  async getProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Sesión no válida o usuario no encontrado');
    }

    const { passwordHash, ...rest } = user;
    return rest;
  }

  private generateToken(userId: string, email: string, role: string, tenantId: string): string {
    const payload = { sub: userId, email, role, tenantId };
    return this.jwtService.sign(payload);
  }
}
