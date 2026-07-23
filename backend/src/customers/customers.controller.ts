import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /** Crear cliente — MANAGER y OWNER */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER)
  create(
    @Body('name') name: string,
    @Body('taxId') taxId: string | undefined,
    @Body('phone') phone: string | undefined,
    @Body('email') email: string | undefined,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.customersService.create(name, taxId, phone, email, tenantId);
  }

  /** Listar clientes — cualquier usuario autenticado puede ver la lista (necesario para CAJERO al cobrar) */
  @Get()
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.customersService.findAll(tenantId);
  }

  /** Ver cliente individual */
  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.customersService.findOne(id, tenantId);
  }

  /** Editar cliente — MANAGER y OWNER */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER)
  update(
    @Param('id') id: string,
    @Body()
    dto: {
      name: string;
      taxId?: string;
      phone?: string;
      email?: string;
      allowCredit?: boolean;
      creditLimit?: number;
    },
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.customersService.update(id, dto, tenantId);
  }

  /** Eliminar cliente — solo OWNER */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  remove(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.customersService.remove(id, tenantId);
  }

  /** Ver historial de crédito — MANAGER y OWNER */
  @Get(':id/credit-history')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER)
  getCreditHistory(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.customersService.getCreditHistory(id, tenantId);
  }

  /** Registrar abono de deuda — CAJERO puede hacerlo (parte del flujo normal de caja) */
  @Post(':id/pay-credit')
  payCredit(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('paymentMethod') paymentMethod: 'CASH' | 'CARD' | 'TRANSFER',
    @Body('notes') notes: string | undefined,
    @GetUser('tenantId') tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.customersService.payCredit(id, Number(amount), paymentMethod, notes, tenantId, userId);
  }
}
