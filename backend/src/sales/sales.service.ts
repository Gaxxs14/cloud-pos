import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { InventoryLogReason, SaleStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        user: { select: { name: true, email: true } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { name: true, email: true } },
        customer: true,
        saleItems: {
          include: {
            product: { select: { name: true, skuBarcode: true } },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }

  async create(dto: CreateSaleDto, tenantId: string, userId: string) {
    const activeShift = await this.prisma.cashShift.findFirst({
      where: {
        userId,
        tenantId,
        status: 'OPEN',
      },
    });

    if (!activeShift) {
      throw new BadRequestException('Debes abrir una sesión de caja antes de registrar ventas.');
    }

    // 1. Obtener o determinar almacén activo
    let selectedWarehouse: any;
    if (dto.warehouseId) {
      selectedWarehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId, isActive: true },
      });
      if (!selectedWarehouse) {
        throw new BadRequestException('El almacén especificado no existe o no está activo.');
      }
    } else {
      selectedWarehouse = await this.prisma.warehouse.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!selectedWarehouse) {
        throw new BadRequestException('No hay almacenes configurados para esta tienda.');
      }
    }
    // Validar Crédito (Fiado)
    let selectedCustomer = null;
    if (dto.paymentMethod === 'CREDIT') {
      if (!dto.customerId) {
        throw new BadRequestException('Debes seleccionar un cliente para registrar una venta a crédito (fiado).');
      }
      selectedCustomer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!selectedCustomer) {
        throw new NotFoundException('Cliente no encontrado.');
      }
      if (!selectedCustomer.allowCredit) {
        throw new BadRequestException('El cliente seleccionado no tiene habilitado el crédito (fiado).');
      }
      const totalAmount = Number(dto.totalAmount);
      const totalDebt = Number(selectedCustomer.currentDebt) + totalAmount;
      if (totalDebt > Number(selectedCustomer.creditLimit)) {
        throw new BadRequestException(
          `Límite de crédito excedido. Deuda actual: \$${selectedCustomer.currentDebt}, Límite: \$${selectedCustomer.creditLimit}, Total venta: \$${totalAmount}`,
        );
      }
    }

    const productIds = dto.items.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
      },
    });

    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Uno o más productos no existen o no pertenecen a esta tienda');
    }

    const productsMap = new Map(products.map((p) => [p.id, p]));

    // 2. Obtener y validar existencias por almacén específico
    const productStocks = await this.prisma.productStock.findMany({
      where: {
        warehouseId: selectedWarehouse.id,
        productId: { in: productIds },
      },
    });
    const stocksMap = new Map(productStocks.map((s) => [s.productId, Number(s.stock)]));

    for (const item of dto.items) {
      const product = productsMap.get(item.productId);
      if (!product) continue;
      
      const currentStock = stocksMap.get(item.productId) || 0;
      if (currentStock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto "${product.name}" en la bodega "${selectedWarehouse.name}". Disponible: ${currentStock}, Solicitado: ${item.quantity}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 3. Crear cabecera de venta asociada a sucursal y almacén
      const sale = await tx.sale.create({
        data: {
          tenantId,
          userId,
          customerId: dto.customerId || null,
          totalAmount: dto.totalAmount,
          taxAmount: dto.taxAmount || 0,
          discountAmount: dto.discountAmount || 0,
          paymentMethod: dto.paymentMethod,
          status: SaleStatus.COMPLETED,
          shiftId: activeShift.id,
          warehouseId: selectedWarehouse.id,
          branchId: selectedWarehouse.branchId,
        },
      });

      // Si la venta es a crédito, actualizar la deuda del cliente y crear el log correspondiente
      if (dto.paymentMethod === 'CREDIT') {
        const total = Number(dto.totalAmount);
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            currentDebt: {
              increment: total,
            },
          },
        });

        await tx.customerCreditLog.create({
          data: {
            tenantId,
            customerId: dto.customerId!,
            saleId: sale.id,
            amount: total,
            type: 'DEBT',
            notes: `Compra a crédito (Ticket: ${sale.id.substring(0, 8)})`,
          },
        });
      }

      // Incrementar el acumulador del turno según el método de pago
      // CREDIT no se acumula aquí porque no es efectivo recibido — es deuda del cliente
      const amount = Number(dto.totalAmount);
      if (dto.paymentMethod !== 'CREDIT') {
        await tx.cashShift.update({
          where: { id: activeShift.id },
          data: {
            cashSales:     dto.paymentMethod === 'CASH'     ? { increment: amount } : undefined,
            cardSales:     dto.paymentMethod === 'CARD'     ? { increment: amount } : undefined,
            transferSales: dto.paymentMethod === 'TRANSFER' ? { increment: amount } : undefined,
            // SPLIT: por simplicidad, acumula en cashSales hasta implementar split multi-campo
            ...(dto.paymentMethod === 'SPLIT' ? { cashSales: { increment: amount } } : {}),
          },
        });
      }

      const saleItemsData = [];
      const inventoryLogsData = [];

      for (const item of dto.items) {
        const product = productsMap.get(item.productId);
        if (!product) continue;

        const discount = item.discount || 0;
        const subtotal = (item.quantity * item.unitPrice) - discount;

        saleItemsData.push({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount,
          subtotal,
        });

        inventoryLogsData.push({
          tenantId,
          productId: item.productId,
          userId,
          warehouseId: selectedWarehouse.id,
          quantity: -item.quantity,
          reason: InventoryLogReason.SALE,
        });

        // Descontar del inventario de la bodega
        await tx.productStock.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: selectedWarehouse.id,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        // Descontar del inventario global del producto
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.saleItem.createMany({
        data: saleItemsData,
      });

      await tx.inventoryLog.createMany({
        data: inventoryLogsData,
      });

      return tx.sale.findFirst({
        where: { id: sale.id, tenantId },
        include: {
          user: { select: { name: true, email: true } },
          customer: true,
          saleItems: {
            include: {
              product: { select: { name: true, skuBarcode: true } },
            },
          },
        },
      });
    });
  }
}
