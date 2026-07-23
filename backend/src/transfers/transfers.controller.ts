import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('transfers')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /** Crear traspaso — solo MANAGER y OWNER */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER)
  create(
    @Body() dto: CreateTransferDto,
    @GetUser('tenantId') tenantId: string,
    @GetUser('id') userId: string,
  ) {
    return this.transfersService.create(dto, tenantId, userId);
  }

  /** Ver historial de traspasos — solo MANAGER y OWNER */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER)
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.transfersService.findAll(tenantId);
  }

  /** Ver traspaso individual — solo MANAGER y OWNER */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.OWNER)
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.transfersService.findOne(id, tenantId);
  }
}
