import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import type { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
@Roles(Role.MANAGER, Role.OWNER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @GetUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getSummary(tenantId, startDate, endDate, branchId);
  }

  @Get('top-products')
  getTopProducts(
    @GetUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getTopProducts(tenantId, startDate, endDate, branchId);
  }

  @Get('payment-methods')
  getPaymentMethods(
    @GetUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getPaymentMethods(tenantId, startDate, endDate, branchId);
  }

  @Get('inventory-valuation')
  getInventoryValuation(
    @GetUser('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportsService.getInventoryValuation(tenantId, branchId);
  }

  @Get('export-sales')
  async exportSales(
    @Res() res: Response,
    @GetUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    const csvContent = await this.reportsService.exportSalesCsv(tenantId, startDate, endDate, branchId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-ventas.csv');
    return res.status(200).send(csvContent);
  }
}
