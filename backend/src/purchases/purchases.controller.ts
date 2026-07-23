import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('purchases')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Body() dto: CreatePurchaseDto,
    @GetUser('id') userId: string,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.purchasesService.create(dto, userId, tenantId);
  }

  @Get()
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.purchasesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.purchasesService.findOne(id, tenantId);
  }
}
