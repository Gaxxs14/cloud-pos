import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftStatus, CashTransactionType } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Abre un nuevo turno de caja
  async openShift(userId: string, tenantId: string, openingBalance: number, branchId?: string) {
    // Verificar si el usuario ya tiene un turno abierto
    const activeShift = await this.prisma.cashShift.findFirst({
      where: {
        userId,
        tenantId,
        status: ShiftStatus.OPEN,
      },
    });

    if (activeShift) {
      throw new BadRequestException('Ya tienes una sesión de caja abierta.');
    }

    return this.prisma.cashShift.create({
      data: {
        tenantId,
        userId,
        branchId: branchId || null,
        status: ShiftStatus.OPEN,
        openingBalance: openingBalance,
        closingBalance: openingBalance, // Al abrir, el saldo teórico es igual al inicial
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        cashIn: 0,
        cashOut: 0,
      },
    });
  }

  // Obtiene el turno activo del cajero
  async getActiveShift(userId: string, tenantId: string) {
    return this.prisma.cashShift.findFirst({
      where: {
        userId,
        tenantId,
        status: ShiftStatus.OPEN,
      },
    });
  }

  // Registra un movimiento de efectivo manual (Ingreso / Egreso)
  async addTransaction(
    userId: string,
    tenantId: string,
    amount: number,
    type: CashTransactionType,
    description: string,
  ) {
    const activeShift = await this.getActiveShift(userId, tenantId);
    if (!activeShift) {
      throw new BadRequestException('No hay una sesión de caja activa para registrar movimientos.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Crear la transacción
      const transaction = await tx.cashTransaction.create({
        data: {
          shiftId: activeShift.id,
          amount,
          type,
          description,
        },
      });

      // Actualizar los totales del turno
      await tx.cashShift.update({
        where: { id: activeShift.id },
        data: {
          cashIn: type === CashTransactionType.IN ? { increment: amount } : undefined,
          cashOut: type === CashTransactionType.OUT ? { increment: amount } : undefined,
        },
      });

      return transaction;
    });
  }

  // Cierre de caja, calculando montos y diferencias
  async closeShift(
    userId: string,
    tenantId: string,
    declaredBalance: number,
    declaredBalanceUsd?: number,
    declaredBalanceBs?: number,
  ) {
    const activeShift = await this.getActiveShift(userId, tenantId);
    if (!activeShift) {
      throw new BadRequestException('No hay una sesión de caja activa para cerrar.');
    }

    // 1. Obtener todas las ventas asociadas a este turno
    const sales = await this.prisma.sale.findMany({
      where: {
        shiftId: activeShift.id,
        status: 'COMPLETED',
      },
    });

    // 2. Sumar ventas por método de pago
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;
    let creditSales = 0; // Ventas a fiado — no tocan la caja física

    for (const sale of sales) {
      const amount = parseFloat(sale.totalAmount.toString());
      if (sale.paymentMethod === 'CASH') {
        cashSales += amount;
      } else if (sale.paymentMethod === 'CARD') {
        cardSales += amount;
      } else if (sale.paymentMethod === 'TRANSFER') {
        transferSales += amount;
      } else if (sale.paymentMethod === 'CREDIT') {
        // Ventas a crédito no ingresan a la caja física, se registran aparte
        creditSales += amount;
      } else if (sale.paymentMethod === 'SPLIT') {
        // SPLIT: conservadoramente al efectivo hasta que se implemente multi-campo
        cashSales += amount;
      }
    }

    // 3. Obtener transacciones manuales
    const cashTransactions = await this.prisma.cashTransaction.findMany({
      where: { shiftId: activeShift.id },
    });

    let cashIn = 0;
    let cashOut = 0;

    for (const tx of cashTransactions) {
      const amount = parseFloat(tx.amount.toString());
      if (tx.type === CashTransactionType.IN) {
        cashIn += amount;
      } else if (tx.type === CashTransactionType.OUT) {
        cashOut += amount;
      }
    }

    // 4. Calcular saldo de cierre teórico
    // Nota: El dinero físico en caja solo se ve afectado por efectivo inicial, ventas en efectivo y movimientos manuales de caja.
    const openingBalance = parseFloat(activeShift.openingBalance.toString());
    const closingBalance = openingBalance + cashSales + cashIn - cashOut;

    // 5. Calcular diferencia
    const difference = declaredBalance - closingBalance;

    // 6. Actualizar y cerrar el turno
    const closedShift = await this.prisma.cashShift.update({
      where: { id: activeShift.id },
      data: {
        status: ShiftStatus.CLOSED,
        closedAt: new Date(),
        declaredBalance,
        declaredBalanceUsd: declaredBalanceUsd !== undefined ? declaredBalanceUsd : null,
        declaredBalanceBs: declaredBalanceBs !== undefined ? declaredBalanceBs : null,
        closingBalance,
        cashSales,
        cardSales,
        transferSales,
        cashIn,
        cashOut,
        difference,
      },
      include: {
        cashTransactions: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Enviar correo electrónico de Corte Z en segundo plano de forma asíncrona
    this.sendCloseShiftEmail(closedShift, tenantId).catch((err) => {
      console.error('Error enviando correo de Corte Z en segundo plano:', err);
    });

    return closedShift;
  }

  // Helper para generar y enviar el correo electrónico de Corte Z
  private async sendCloseShiftEmail(shift: any, tenantId: string) {
    try {
      // 1. Buscar el correo del OWNER del tenant para notificarle
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, role: 'OWNER' },
      });

      const recipient = owner?.email || shift.user?.email;
      if (!recipient) {
        console.warn(`No se encontró destinatario de correo para el Corte Z del tenant ${tenantId}`);
        return;
      }

      const difference = parseFloat(shift.difference?.toString() || '0');
      const diffColor = difference < 0 ? '#EF4444' : (difference > 0 ? '#F59E0B' : '#10B981');
      const diffText = difference < 0 ? 'FALTANTE' : (difference > 0 ? 'SOBRANTE' : 'DIFERENCIA');

      const openedDateStr = shift.openedAt ? new Date(shift.openedAt).toLocaleString() : 'N/A';
      const closedDateStr = shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'N/A';

      const subject = `[Cloud POS] Cierre de Caja (Corte Z) - ${shift.user?.name || 'Cajero'}`;

      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); color: #334155;">
          <div style="background-color: #4F46E5; color: white; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Cierre de Caja (Corte Z)</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Reporte diario de arqueo de caja - Cloud POS</p>
          </div>
          
          <div style="padding: 24px; background-color: #FFFFFF;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #64748B;">Cajero:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #0F172A;">${shift.user?.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #64748B;">Apertura:</td>
                <td style="padding: 6px 0; text-align: right; color: #334155;">${openedDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #64748B;">Cierre:</td>
                <td style="padding: 6px 0; text-align: right; color: #334155;">${closedDateStr}</td>
              </tr>
            </table>

            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <span style="font-size: 10px; font-weight: bold; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Resumen de Efectivo</span>
              <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 8px 0;" />
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748B;">Fondo Inicial:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #334155;">$${parseFloat(shift.openingBalance?.toString() || '0').toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748B;">Ventas en Efectivo (+):</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #334155;">$${parseFloat(shift.cashSales?.toString() || '0').toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748B;">Entradas de Caja (+):</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #334155;">$${parseFloat(shift.cashIn?.toString() || '0').toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748B;">Salidas de Caja (-):</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #334155;">$${parseFloat(shift.cashOut?.toString() || '0').toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #E2E8F0;">
                  <td style="padding: 8px 0 4px 0; font-weight: bold; color: #0F172A;">Efectivo Teórico (Esperado):</td>
                  <td style="padding: 8px 0 4px 0; text-align: right; font-weight: bold; color: #4F46E5; font-size: 14px;">$${parseFloat(shift.closingBalance?.toString() || '0').toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #0F172A;">Efectivo Declarado (Total):</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0F172A; font-size: 14px;">$${parseFloat(shift.declaredBalance?.toString() || '0').toFixed(2)}</td>
                </tr>
                ${shift.declaredBalanceUsd !== null && shift.declaredBalanceUsd !== undefined ? `
                <tr>
                  <td style="padding: 2px 0 2px 16px; color: #64748B;">• Efectivo Dólares ($):</td>
                  <td style="padding: 2px 0 2px 0; text-align: right; font-weight: 550; color: #475569;">$${parseFloat(shift.declaredBalanceUsd.toString()).toFixed(2)}</td>
                </tr>
                ` : ''}
                ${shift.declaredBalanceBs !== null && shift.declaredBalanceBs !== undefined ? `
                <tr>
                  <td style="padding: 2px 0 2px 16px; color: #64748B;">• Efectivo Bolívares (Bs.):</td>
                  <td style="padding: 2px 0 2px 0; text-align: right; font-weight: 550; color: #475569;">Bs. ${parseFloat(shift.declaredBalanceBs.toString()).toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 1px dashed #E2E8F0;">
                  <td style="padding: 8px 0 0 0; font-weight: bold; color: ${diffColor};">${diffText}:</td>
                  <td style="padding: 8px 0 0 0; text-align: right; font-weight: bold; color: ${diffColor}; font-size: 15px;">$${difference.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <span style="font-size: 10px; font-weight: bold; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Otros Medios de Pago (Sin Efectivo)</span>
              <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 8px 0;" />
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748B;">Ventas con Tarjeta:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #334155;">$${parseFloat(shift.cardSales?.toString() || '0').toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748B;">Ventas por Transferencia:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #334155;">$${parseFloat(shift.transferSales?.toString() || '0').toFixed(2)}</td>
                </tr>
              </table>
            </div>

            ${shift.cashTransactions && shift.cashTransactions.length > 0 ? `
              <div style="margin-bottom: 24px;">
                <span style="font-size: 10px; font-weight: bold; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Transacciones Manuales de Caja</span>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #E2E8F0;">
                  <thead>
                    <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: left;">
                      <th style="padding: 8px;">Tipo</th>
                      <th style="padding: 8px;">Monto</th>
                      <th style="padding: 8px;">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${shift.cashTransactions.map((tx: any) => `
                      <tr style="border-bottom: 1px solid #F1F5F9;">
                        <td style="padding: 8px; font-weight: bold; color: ${tx.type === 'IN' ? '#10B981' : '#EF4444'};">${tx.type === 'IN' ? 'ENTRADA' : 'SALIDA'}</td>
                        <td style="padding: 8px; font-weight: bold;">$${parseFloat(tx.amount?.toString() || '0').toFixed(2)}</td>
                        <td style="padding: 8px; color: #64748B;">${tx.description || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div style="text-align: center; font-size: 11px; color: #94A3B8; margin-top: 32px; border-top: 1px solid #F1F5F9; padding-top: 16px;">
              Este es un correo automático generado por Cloud POS.<br />Por favor no respondas a este mensaje.
            </div>
          </div>
        </div>
      `;

      await this.mailService.sendMail(recipient, subject, html);
    } catch (err) {
      console.error('Error detallado en la preparación o envío del correo del Corte Z:', err);
    }
  }

  // Lista el historial de turnos de la tienda
  async getHistory(tenantId: string, filters: { userId?: string; status?: ShiftStatus }) {
    return this.prisma.cashShift.findMany({
      where: {
        tenantId,
        userId: filters.userId || undefined,
        status: filters.status || undefined,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });
  }

  // Detalle extendido de un turno para auditoría
  async getShiftDetail(id: string, tenantId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        cashTransactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        sales: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            customer: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }

    return shift;
  }
}
