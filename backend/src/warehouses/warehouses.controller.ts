import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role, InventoryLogReason } from '@prisma/client';

import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Body('name') name: string,
    @Body('branchId') branchId: string,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.warehousesService.create(name, branchId, tenantId);
  }

  @Get()
  findAll(
    @GetUser('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.warehousesService.findAll(tenantId, branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.warehousesService.findOne(id, tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @Param('id') id: string,
    @Body('name') name: string,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.warehousesService.update(id, name, tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.warehousesService.remove(id, tenantId);
  }

  @Get(':id/stock')
  getStock(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.warehousesService.getStock(id, tenantId);
  }

  @Post(':id/adjust')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  adjust(
    @Param('id') id: string,
    @Body('productId') productId: string,
    @Body('quantity') quantity: number,
    @Body('reason') reason: InventoryLogReason,
    @GetUser('tenantId') tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.warehousesService.adjustStock(id, productId, Number(quantity), reason, tenantId, userId);
  }
}
