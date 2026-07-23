import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Body() dto: CreateCategoryDto,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.categoriesService.create(dto, tenantId);
  }

  @Get()
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.categoriesService.findOne(id, tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: CreateCategoryDto,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.categoriesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(
    @Param('id') id: string,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.categoriesService.remove(id, tenantId);
  }
}
