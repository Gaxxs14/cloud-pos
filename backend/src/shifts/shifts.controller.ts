import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ShiftStatus, CashTransactionType } from '@prisma/client';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('shifts')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  open(
    @GetUser('id') userId: string,
    @GetUser('tenantId') tenantId: string,
    @Body('openingBalance') openingBalance: number,
    @Body('branchId') branchId?: string,
  ) {
    return this.shiftsService.openShift(userId, tenantId, Number(openingBalance), branchId);
  }

  @Get('active')
  active(@GetUser('id') userId: string, @GetUser('tenantId') tenantId: string) {
    return this.shiftsService.getActiveShift(userId, tenantId);
  }

  @Post('transaction')
  addTransaction(
    @GetUser('id') userId: string,
    @GetUser('tenantId') tenantId: string,
    @Body('amount') amount: number,
    @Body('type') type: CashTransactionType,
    @Body('description') description: string,
  ) {
    return this.shiftsService.addTransaction(userId, tenantId, Number(amount), type, description);
  }

  @Post('close')
  close(
    @GetUser('id') userId: string,
    @GetUser('tenantId') tenantId: string,
    @Body('declaredBalance') declaredBalance: number,
    @Body('declaredBalanceUsd') declaredBalanceUsd?: number,
    @Body('declaredBalanceBs') declaredBalanceBs?: number,
  ) {
    return this.shiftsService.closeShift(
      userId,
      tenantId,
      Number(declaredBalance),
      declaredBalanceUsd !== undefined ? Number(declaredBalanceUsd) : undefined,
      declaredBalanceBs !== undefined ? Number(declaredBalanceBs) : undefined,
    );
  }

  @Get('history')
  history(
    @GetUser('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('status') status?: ShiftStatus,
  ) {
    return this.shiftsService.getHistory(tenantId, { userId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.shiftsService.getShiftDetail(id, tenantId);
  }
}
