import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, address: string | undefined, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la sucursal
      const branch = await tx.branch.create({
        data: {
          tenantId,
          name,
          address,
        },
      });

      // 2. Crear un almacén principal por defecto para la nueva sucursal
      await tx.warehouse.create({
        data: {
          tenantId,
          branchId: branch.id,
          name: `${name} - Bodega General`,
        },
      });

      return branch;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId, isActive: true },
      include: {
        warehouses: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
      include: {
        warehouses: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    return branch;
  }

  async update(id: string, name: string, address: string | undefined, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    // Hacemos un borrado lógico para no romper integridad referencial de ventas
    return this.prisma.branch.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
