import { Controller, Get, Post, Body, Req, Headers, UseGuards, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Request } from 'express';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getBillingStatus(@GetUser('tenantId') tenantId: string) {
    return this.billingService.getBillingStatus(tenantId);
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  createCheckoutSession(
    @Body('priceId') priceId: string,
    @GetUser('tenantId') tenantId: string,
    @GetUser('email') userEmail: string,
  ) {
    if (!priceId) {
      throw new BadRequestException('priceId es requerido.');
    }
    return this.billingService.createCheckoutSession(priceId, tenantId, userEmail);
  }

  @Post('portal-session')
  @UseGuards(JwtAuthGuard)
  createPortalSession(@GetUser('tenantId') tenantId: string) {
    return this.billingService.createPortalSession(tenantId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('No raw request body available.');
    }
    return this.billingService.handleWebhook(signature, rawBody);
  }
}
