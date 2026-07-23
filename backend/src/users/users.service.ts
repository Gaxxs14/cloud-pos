import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      include: {
        branch: true,
      },
      orderBy: { name: 'asc' },
    });

    // Remover passwordHash de la respuesta
    return users.map((u) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: {
        branch: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async create(dto: CreateUserDto, tenantId: string) {
    // 1. Verificar si el correo ya existe
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException('Este correo electrónico ya está registrado');
    }

    // 2. Verificar que la sucursal pertenezca al tenant si se especifica
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('La sucursal seleccionada no es válida para tu tienda');
      }
    }

    // 3. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // 4. Crear usuario
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        branchId: dto.branchId || null,
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
      },
    });

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string) {
    // 1. Validar existencia
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Validar nuevo email si cambia
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictException('Este correo electrónico ya está registrado');
      }
    }

    // 3. Validar sucursal si cambia
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('La sucursal seleccionada no es válida para tu tienda');
      }
    }

    // 4. Preparar datos de actualización
    const dataToUpdate: any = {
      name: dto.name,
      email: dto.email ? dto.email.toLowerCase() : undefined,
      role: dto.role,
      branchId: dto.branchId !== undefined ? (dto.branchId || null) : undefined,
    };

    // 5. Encriptar contraseña si se provee
    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.passwordHash = await bcrypt.hash(dto.password, salt);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const { passwordHash: _, ...rest } = updatedUser;
    return rest;
  }

  async remove(id: string, tenantId: string, currentUserId: string) {
    // 1. Validar existencia
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Prevenir auto-eliminación
    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propio usuario administrador');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
