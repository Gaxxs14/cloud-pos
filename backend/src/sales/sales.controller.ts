import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.salesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.salesService.findOne(id, tenantId);
  }

  @Post()
  create(
    @Body() createSaleDto: CreateSaleDto,
    @GetUser('tenantId') tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.salesService.create(createSaleDto, tenantId, userId);
  }
}
