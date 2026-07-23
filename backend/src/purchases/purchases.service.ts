import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { InventoryLogReason } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.purchase.findMany({
      where: { tenantId },
      include: {
        supplier: { select: { name: true } },
        warehouse: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        warehouse: true,
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, skuBarcode: true } },
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Factura de compra no encontrada');
    }

    return purchase;
  }

  async create(dto: CreatePurchaseDto, userId: string, tenantId: string) {
    // 1. Validar Proveedor
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId, isActive: true },
    });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // 2. Validar Almacén
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId, isActive: true },
    });
    if (!warehouse) {
      throw new NotFoundException('Almacén no encontrado');
    }

    // 3. Calcular total
    let total = 0;
    for (const item of dto.items) {
      total += item.quantity * item.costPrice;
    }

    // 4. Procesar en transacción de base de datos
    return this.prisma.$transaction(async (tx) => {
      // a. Crear registro de Compra
      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          supplierId: dto.supplierId,
          warehouseId: dto.warehouseId,
          userId,
          invoiceNumber: dto.invoiceNumber || undefined,
          totalAmount: total,
          notes: dto.notes || undefined,
        },
      });

      // b. Procesar cada renglón
      for (const item of dto.items) {
        const subtotal = item.quantity * item.costPrice;

        // Validar que el producto exista
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });
        if (!product) {
          throw new NotFoundException(`Producto con ID ${item.productId} no encontrado`);
        }

        // i. Crear PurchaseItem
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: item.quantity,
            costPrice: item.costPrice,
            subtotal,
          },
        });

        // ii. Actualizar stock general en Product
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            costPrice: item.costPrice, // Actualizar costo al último precio de compra
          },
        });

        // iii. Actualizar stock local de Almacén (ProductStock)
        await tx.productStock.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
            stock: item.quantity,
          },
          update: {
            stock: { increment: item.quantity },
          },
        });

        // iv. Crear log de inventario
        await tx.inventoryLog.create({
          data: {
            tenantId,
            productId: item.productId,
            userId,
            warehouseId: dto.warehouseId,
            quantity: item.quantity,
            reason: InventoryLogReason.RESTOCK,
          },
        });
      }

      return purchase;
    });
  }
}
