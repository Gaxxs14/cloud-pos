import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { InventoryLogReason } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, search?: string) {
    const whereClause: any = { tenantId, isActive: true };

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { skuBarcode: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async create(dto: CreateProductDto, tenantId: string, userId: string) {
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new BadRequestException('La categoría especificada no existe en esta tienda');
      }
    }

    if (dto.skuBarcode) {
      const existingProduct = await this.prisma.product.findFirst({
        where: { skuBarcode: dto.skuBarcode, tenantId },
      });
      if (existingProduct) {
        throw new BadRequestException('Ya existe un producto con este código de barras');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId,
          categoryId: dto.categoryId || null,
          name: dto.name,
          description: dto.description || null,
          skuBarcode: dto.skuBarcode || null,
          imageUrl: dto.imageUrl || null,
          costPrice: dto.costPrice,
          sellPrice: dto.sellPrice,
          stock: dto.stock || 0,
          minStock: dto.minStock || 0,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      // Obtener almacenes del Tenant para inicializar existencias
      const warehouses = await tx.warehouse.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (warehouses.length > 0) {
        const defaultWH = warehouses[0];

        // Crear registros de ProductStock para cada almacén
        await tx.productStock.createMany({
          data: warehouses.map((w) => ({
            productId: product.id,
            warehouseId: w.id,
            stock: w.id === defaultWH.id ? (dto.stock || 0) : 0,
          })),
        });

        // Registrar log de inventario asociado al almacén por defecto
        if (dto.stock && dto.stock > 0) {
          await tx.inventoryLog.create({
            data: {
              tenantId,
              productId: product.id,
              userId,
              warehouseId: defaultWH.id,
              quantity: dto.stock,
              reason: InventoryLogReason.RESTOCK,
            },
          });
        }
      } else {
        // Fallback en caso de que no existan almacenes aún
        if (dto.stock && dto.stock > 0) {
          await tx.inventoryLog.create({
            data: {
              tenantId,
              productId: product.id,
              userId,
              quantity: dto.stock,
              reason: InventoryLogReason.RESTOCK,
            },
          });
        }
      }

      return product;
    });
  }

  async update(id: string, dto: CreateProductDto, tenantId: string) {
    await this.findOne(id, tenantId);

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new BadRequestException('La categoría especificada no existe en esta tienda');
      }
    }

    if (dto.skuBarcode) {
      const existingProduct = await this.prisma.product.findFirst({
        where: { 
          skuBarcode: dto.skuBarcode, 
          tenantId,
          id: { not: id }
        },
      });
      if (existingProduct) {
        throw new BadRequestException('Ya existe otro producto con este código de barras');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId || null,
        name: dto.name,
        description: dto.description || null,
        skuBarcode: dto.skuBarcode || null,
        imageUrl: dto.imageUrl || null,
        costPrice: dto.costPrice,
        sellPrice: dto.sellPrice,
        minStock: dto.minStock || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    try {
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch {
      return this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }
  }
}
