import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  async create(dto: CreateCategoryDto, tenantId: string) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        tenantId,
      },
    });
  }

  async update(id: string, dto: CreateCategoryDto, tenantId: string) {
    await this.findOne(id, tenantId); // Valida que exista y pertenezca al tenant

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // Valida que exista y pertenezca al tenant

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
