import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryLogReason } from '@prisma/client';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, branchId: string, tenantId: string) {
    // Verificar que la sucursal exista y pertenezca al tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new BadRequestException('La sucursal especificada no existe en tu tienda.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear almacén
      const warehouse = await tx.warehouse.create({
        data: {
          tenantId,
          branchId,
          name,
        },
      });

      // 2. Inicializar ProductStock para todos los productos existentes del Tenant en este almacén
      const products = await tx.product.findMany({
        where: { tenantId },
        select: { id: true },
      });

      if (products.length > 0) {
        await tx.productStock.createMany({
          data: products.map((p) => ({
            productId: p.id,
            warehouseId: warehouse.id,
            stock: 0,
          })),
        });
      }

      return warehouse;
    });
  }

  async findAll(tenantId: string, branchId?: string) {
    return this.prisma.warehouse.findMany({
      where: {
        tenantId,
        branchId: branchId || undefined,
        isActive: true,
      },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        branch: true,
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Almacén no encontrado');
    }

    return warehouse;
  }

  async update(id: string, name: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.warehouse.update({
      where: { id },
      data: { name },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Obtiene los niveles de existencias detallados de un almacén
  async getStock(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.productStock.findMany({
      where: {
        warehouseId: id,
        product: {
          isActive: true,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });
  }

  // Realiza un ajuste de inventario manual en una bodega específica
  async adjustStock(
    warehouseId: string,
    productId: string,
    quantity: number,
    reason: InventoryLogReason,
    tenantId: string,
    userId: string,
  ) {
    // Validar almacén
    await this.findOne(warehouseId, tenantId);

    // Validar producto
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado en la tienda.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert del nivel de existencias por bodega
      const productStock = await tx.productStock.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
        create: {
          productId,
          warehouseId,
          stock: quantity,
        },
        update: {
          stock: {
            increment: quantity,
          },
        },
      });

      // Validar que el stock resultante no sea menor a 0
      if (Number(productStock.stock) < 0) {
        throw new BadRequestException(
          `Ajuste inválido. El stock resultante sería negativo en esta bodega (${productStock.stock}).`,
        );
      }

      // 2. Registrar log de inventario asociado al almacén
      await tx.inventoryLog.create({
        data: {
          tenantId,
          productId,
          userId,
          warehouseId,
          quantity,
          reason,
        },
      });

      // 3. Recalcular el stock agregado en el modelo Product (para búsquedas rápidas)
      const allStocks = await tx.productStock.findMany({
        where: { productId },
      });
      const totalStock = allStocks.reduce((sum, s) => sum + Number(s.stock), 0);

      await tx.product.update({
        where: { id: productId },
        data: {
          stock: totalStock,
        },
      });

      return productStock;
    });
  }
}
