import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferStatus, InventoryLogReason } from '@prisma/client';

export class CreateTransferDto {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransferDto, tenantId: string, userId: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('El almacén de origen y destino no pueden ser iguales.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Debes incluir al menos un producto para transferir.');
    }

    // 1. Validar que ambos almacenes existan y pertenezcan al tenant
    const fromWH = await this.prisma.warehouse.findFirst({
      where: { id: dto.fromWarehouseId, tenantId },
    });
    const toWH = await this.prisma.warehouse.findFirst({
      where: { id: dto.toWarehouseId, tenantId },
    });

    if (!fromWH || !toWH) {
      throw new NotFoundException('Uno o ambos almacenes no existen o no pertenecen a tu tienda.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 2. Crear cabecera del traspaso
      const transfer = await tx.inventoryTransfer.create({
        data: {
          tenantId,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          userId,
          status: TransferStatus.COMPLETED,
        },
      });

      for (const item of dto.items) {
        if (item.quantity <= 0) {
          throw new BadRequestException('La cantidad a transferir debe ser mayor a 0.');
        }

        // 3. Validar existencia y stock en almacén de origen
        let sourceStock = await tx.productStock.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.fromWarehouseId,
            },
          },
        });

        const prod = await tx.product.findUnique({ where: { id: item.productId } });

        if (!sourceStock) {
          sourceStock = await tx.productStock.create({
            data: {
              productId: item.productId,
              warehouseId: dto.fromWarehouseId,
              stock: prod?.stock ?? 0,
            },
          });
        } else if (Number(sourceStock.stock) === 0 && (prod?.stock ?? 0) > 0) {
          sourceStock = await tx.productStock.update({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: dto.fromWarehouseId,
              },
            },
            data: {
              stock: prod?.stock ?? 0,
            },
          });
        }

        const currentStock = Number(sourceStock.stock);
        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente del producto "${prod?.name || 'Desconocido'}" en la bodega de origen. Disponible: ${currentStock}, Solicitado: ${item.quantity}`,
          );
        }

        // 4. Descontar stock de origen
        await tx.productStock.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.fromWarehouseId,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        // Registrar log de salida de origen
        await tx.inventoryLog.create({
          data: {
            tenantId,
            productId: item.productId,
            userId,
            warehouseId: dto.fromWarehouseId,
            quantity: -item.quantity,
            reason: InventoryLogReason.ADJUSTMENT,
          },
        });

        // 5. Incrementar stock en destino (upsert)
        await tx.productStock.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.toWarehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId: dto.toWarehouseId,
            stock: item.quantity,
          },
          update: {
            stock: {
              increment: item.quantity,
            },
          },
        });

        // Registrar log de entrada en destino
        await tx.inventoryLog.create({
          data: {
            tenantId,
            productId: item.productId,
            userId,
            warehouseId: dto.toWarehouseId,
            quantity: item.quantity,
            reason: InventoryLogReason.ADJUSTMENT,
          },
        });

        // 6. Crear renglón del traspaso
        await tx.inventoryTransferItem.create({
          data: {
            transferId: transfer.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });

        // 7. Recalcular y sincronizar Product.stock global (suma de todos los almacenes activos)
        const allStocks = await tx.productStock.findMany({
          where: {
            productId: item.productId,
            warehouse: { isActive: true },
          },
        });
        const totalStock = allStocks.reduce(
          (sum, s) => sum + Number(s.stock),
          0,
        );
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: totalStock },
        });
      }

      return tx.inventoryTransfer.findUnique({
        where: { id: transfer.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
        },
      });
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.inventoryTransfer.findMany({
      where: { tenantId },
      include: {
        fromWarehouse: {
          select: { name: true },
        },
        toWarehouse: {
          select: { name: true },
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { id, tenantId },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Traspaso no encontrado.');
    }

    return transfer;
  }
}
