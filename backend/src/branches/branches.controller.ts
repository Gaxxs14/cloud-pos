import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('branches')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Body('name') name: string,
    @Body('address') address: string | undefined,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.branchesService.create(name, address, tenantId);
  }

  @Get()
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.branchesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.branchesService.findOne(id, tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('address') address: string | undefined,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.branchesService.update(id, name, address, tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  remove(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.branchesService.remove(id, tenantId);
  }
}
