import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser, ActiveUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('products')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.productsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.productsService.findOne(id, tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser('tenantId') tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.productsService.create(createProductDto, tenantId, userId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateProductDto: CreateProductDto,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.productsService.update(id, updateProductDto, tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.productsService.remove(id, tenantId);
  }
}
