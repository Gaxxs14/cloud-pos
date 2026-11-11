import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 segundos de caché por tenant

  constructor(private prisma: PrismaService) {}

  /** Guardar una nueva tasa de cambio del día */
  async create(dto: CreateExchangeRateDto, tenantId: string) {
    // Invalidar caché del tenant inmediatamente al registrar nueva tasa
    this.cache.delete(tenantId);

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

  /** Obtener la tasa más reciente con caché en memoria ultra-rápida */
  async getCurrent(tenantId: string) {
    const now = Date.now();
    const cached = this.cache.get(tenantId);

    if (cached && cached.expiry > now) {
      return cached.data;
    }

    const rate = await this.prisma.exchangeRate.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const result = rate || { usdToBs: 1, source: 'DEFAULT', date: new Date() };

    this.cache.set(tenantId, {
      data: result,
      expiry: now + this.CACHE_TTL_MS,
    });

    return result;
  }
}
