import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
@Roles(Role.OWNER, Role.MANAGER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body() dto: CreateUserDto,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.usersService.create(dto, tenantId);
  }

  @Get()
  findAll(@GetUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser('tenantId') tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @GetUser('tenantId') tenantId: string,
  ) {
    return this.usersService.update(id, dto, tenantId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser('tenantId') tenantId: string,
    @GetUser('id') currentUserId: string,
  ) {
    return this.usersService.remove(id, tenantId, currentUserId);
  }
}
