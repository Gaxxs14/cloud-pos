import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  /** GET /exchange-rates/current — Tasa vigente (cualquier usuario autenticado) */
  @Get('current')
  getCurrent(@GetUser('tenantId') tenantId: string) {
    return this.service.getCurrent(tenantId);
  }

  /** GET /exchange-rates — Historial de tasas (managers/owners) */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER, Role.ADMIN)
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  /** POST /exchange-rates — Registrar nueva tasa del día (managers/owners) */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER, Role.ADMIN)
  create(
    @GetUser('tenantId') tenantId: string,
    @Body() dto: CreateExchangeRateDto,
  ) {
    return this.service.create(dto, tenantId);
  }
}
