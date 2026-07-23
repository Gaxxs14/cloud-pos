import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(tenantId: string, startDate?: string, endDate?: string, branchId?: string) {
    const whereClause: any = {
      tenantId,
      status: 'COMPLETED',
    };

    if (branchId) {
      whereClause.branchId = branchId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      include: {
        saleItems: {
          include: {
            product: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;

    for (const sale of sales) {
      totalRevenue += Number(sale.totalAmount);
      for (const item of sale.saleItems) {
        const cost = item.product ? Number(item.product.costPrice) : 0;
        totalCost += cost * Number(item.quantity);
      }
    }

    const netProfit = totalRevenue - totalCost;
    const salesCount = sales.length;
    const ticketAverage = salesCount > 0 ? totalRevenue / salesCount : 0;

    return {
      totalRevenue,
      totalCost,
      netProfit,
      salesCount,
      ticketAverage,
    };
  }

  async getTopProducts(tenantId: string, startDate?: string, endDate?: string, branchId?: string) {
    const whereClause: any = {
      sale: {
        tenantId,
        status: 'COMPLETED',
      },
    };

    if (branchId) {
      whereClause.sale.branchId = branchId;
    }

    if (startDate || endDate) {
      whereClause.sale.createdAt = {};
      if (startDate) {
        whereClause.sale.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.sale.createdAt.lte = new Date(endDate);
      }
    }

    const saleItems = await this.prisma.saleItem.findMany({
      where: whereClause,
      include: {
        product: true,
      },
    });

    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const item of saleItems) {
      if (!item.product) continue;
      const pid = item.productId;
      const existing = productMap.get(pid) || { name: item.product.name, quantity: 0, revenue: 0 };

      existing.quantity += Number(item.quantity);
      existing.revenue += Number(item.subtotal);
      productMap.set(pid, existing);
    }

    const sorted = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return sorted;
  }

  async getPaymentMethods(tenantId: string, startDate?: string, endDate?: string, branchId?: string) {
    const whereClause: any = {
      tenantId,
      status: 'COMPLETED',
    };

    if (branchId) {
      whereClause.branchId = branchId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const methodsData = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return methodsData.map((item) => ({
      method: item.paymentMethod,
      totalAmount: Number(item._sum.totalAmount || 0),
      count: item._count.id,
    }));
  }

  async getInventoryValuation(tenantId: string, branchId?: string) {
    const whereClause: any = {
      product: {
        tenantId,
      },
      warehouse: {
        isActive: true,
      },
    };

    if (branchId) {
      whereClause.warehouse.branchId = branchId;
    }

    const stocks = await this.prisma.productStock.findMany({
      where: whereClause,
      include: {
        product: true,
      },
    });

    let totalCost = 0;
    let totalSellValue = 0;
    let totalItems = 0;

    for (const item of stocks) {
      if (!item.product) continue;
      const qty = Number(item.stock);
      const cost = Number(item.product.costPrice);
      const sell = Number(item.product.sellPrice);

      totalCost += cost * qty;
      totalSellValue += sell * qty;
      totalItems += qty;
    }

    const potentialProfit = totalSellValue - totalCost;

    return {
      totalCost,
      totalSellValue,
      potentialProfit,
      totalItems,
    };
  }

  async exportSalesCsv(tenantId: string, startDate?: string, endDate?: string, branchId?: string) {
    const whereClause: any = {
      tenantId,
      status: 'COMPLETED',
    };

    if (branchId) {
      whereClause.branchId = branchId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const sales = await this.prisma.sale.findMany({
      where: whereClause,
      include: {
        customer: true,
        user: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvRows = [
      'Fecha,TicketID,Sucursal,Cliente,Metodo Pago,Monto Total,Impuestos,Descuento,Cajero',
    ];

    for (const sale of sales) {
      const sanitizedCustomer = (sale.customer?.name || 'Publico General').replace(/,/g, '');
      const sanitizedUser = (sale.user?.name || '').replace(/,/g, '');
      const sanitizedBranch = (sale.branch?.name || 'Matriz').replace(/,/g, '');
      
      csvRows.push(
        [
          sale.createdAt.toISOString().split('T')[0],
          sale.id,
          sanitizedBranch,
          sanitizedCustomer,
          sale.paymentMethod,
          Number(sale.totalAmount).toFixed(2),
          Number(sale.taxAmount).toFixed(2),
          Number(sale.discountAmount).toFixed(2),
          sanitizedUser,
        ].join(','),
      );
    }

    return csvRows.join('\n');
  }
}
