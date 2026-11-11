import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 segundos de caché por tenant

  constructor(private prisma: PrismaService) {}

  /** Consultar la tasa oficial del BCV en vivo desde el proveedor oficial */
  async fetchBcvOfficialRate(): Promise<{ rate: number; date: string; source: string }> {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const rate = typeof data.promedio === 'number' ? data.promedio : parseFloat(data.promedio);
      if (!rate || isNaN(rate) || rate <= 0) {
        throw new Error('Tasa numérica inválida recibida del BCV');
      }

      return {
        rate: Math.round(rate * 10000) / 10000,
        date: data.fechaActualizacion || new Date().toISOString(),
        source: 'BCV_OFICIAL',
      };
    } catch (err: any) {
      console.error('[ExchangeRatesService] Error consultando API BCV:', err.message);
      throw new Error(`No se pudo obtener la tasa oficial del BCV: ${err.message}`);
    }
  }

  /** Sincronizar y registrar automáticamente la tasa del BCV para un tenant */
  async syncBcvRate(tenantId: string) {
    const { rate } = await this.fetchBcvOfficialRate();

    const current = await this.prisma.exchangeRate.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Si ya existe y es exactamente la misma registrada en el mismo día, no duplicar innecesariamente
    if (current && Math.abs(Number(current.usdToBs) - rate) < 0.0001) {
      this.cache.set(tenantId, {
        data: current,
        expiry: Date.now() + this.CACHE_TTL_MS,
      });
      return { ...current, synchronized: true, isNew: false };
    }

    this.cache.delete(tenantId);
    const newRate = await this.prisma.exchangeRate.create({
      data: {
        tenantId,
        usdToBs: rate,
        source: 'BCV_AUTO',
      },
    });

    this.cache.set(tenantId, {
      data: newRate,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });

    return { ...newRate, synchronized: true, isNew: true };
  }

  /** Guardar una nueva tasa de cambio del día manualmente */
  async create(dto: CreateExchangeRateDto, tenantId: string) {
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
      take: 60,
    });
  }

  /** Obtener la tasa más reciente con auto-actualización si está vencida */
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

    // Si no tiene tasa o la última tasa tiene más de 12 horas, intentar sincronizar con BCV en segundo plano
    if (!rate || (now - new Date(rate.createdAt).getTime()) > 12 * 60 * 60 * 1000) {
      this.syncBcvRate(tenantId).catch(() => {});
    }

    const result = rate || { usdToBs: 1, source: 'DEFAULT', date: new Date() };

    this.cache.set(tenantId, {
      data: result,
      expiry: now + this.CACHE_TTL_MS,
    });

    return result;
  }
}
