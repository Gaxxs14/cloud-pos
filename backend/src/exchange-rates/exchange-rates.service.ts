import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  constructor(private prisma: PrismaService) {}

  /** Guardar una nueva tasa de cambio del día */
  async create(dto: CreateExchangeRateDto, tenantId: string) {
    return this.prisma.exchangeRate.create({
      data: {
        tenantId,
        usdToBs: dto.usdToBs,
        source: dto.source || 'MANUAL',
      },
    });
  }

  /** Obtener historial de tasas del tenant */
  async findAll(tenantId: string) {
    return this.prisma.exchangeRate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 60, // últimas 60 entradas
    });
  }

  /** Obtener la tasa más reciente */
  async getCurrent(tenantId: string) {
    const rate = await this.prisma.exchangeRate.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!rate) {
      // Retornar valor por defecto para no crashear el POS
      return { usdToBs: 1, source: 'DEFAULT', date: new Date() };
    }

    return rate;
  }
}
