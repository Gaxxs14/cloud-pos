import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditLogType, CashTransactionType, ShiftStatus } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, taxId: string | undefined, phone: string | undefined, email: string | undefined, tenantId: string) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        name,
        taxId: taxId || null,
        phone: phone || null,
        email: email || null,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return customer;
  }

  async update(
    id: string,
    dto: {
      name: string;
      taxId?: string;
      phone?: string;
      email?: string;
      allowCredit?: boolean;
      creditLimit?: number;
    },
    tenantId: string,
  ) {
    await this.findOne(id, tenantId);

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        taxId: dto.taxId || null,
        phone: dto.phone || null,
        email: dto.email || null,
        allowCredit: dto.allowCredit,
        creditLimit: dto.creditLimit,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const customer = await this.findOne(id, tenantId);

    if (Number(customer.currentDebt) > 0) {
      throw new BadRequestException('No se puede eliminar un cliente que tiene saldo pendiente deudor.');
    }

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async getCreditHistory(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.customerCreditLog.findMany({
      where: { customerId: id, tenantId },
      include: {
        sale: {
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async payCredit(
    id: string,
    amount: number,
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER',
    notes: string | undefined,
    tenantId: string,
    userId: string,
  ) {
    const customer = await this.findOne(id, tenantId);

    if (amount <= 0) {
      throw new BadRequestException('El monto del abono debe ser mayor a 0.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Reducir la deuda en el cliente
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          currentDebt: {
            decrement: amount,
          },
        },
      });

      // 2. Registrar el log de crédito (tipo PAYMENT, monto negativo)
      await tx.customerCreditLog.create({
        data: {
          tenantId,
          customerId: id,
          amount: -amount,
          type: CreditLogType.PAYMENT,
          notes: notes || `Abono de deuda (${paymentMethod})`,
        },
      });

      // 3. Integración con Caja Registradora: Buscar turno abierto de este cajero
      const activeShift = await tx.cashShift.findFirst({
        where: {
          userId,
          tenantId,
          status: ShiftStatus.OPEN,
        },
      });

      if (activeShift) {
        const desc = `Abono de cliente: ${customer.name}${notes ? ' - ' + notes : ''}`;

        // Registrar movimiento en el arqueo
        await tx.cashTransaction.create({
          data: {
            shiftId: activeShift.id,
            amount: amount,
            type: CashTransactionType.IN,
            description: desc,
          },
        });

        // Actualizar acumuladores del turno:
        // Los abonos siempre se registran como CashTransaction.IN (entrada de dinero).
        // Para efectivo se incrementa cashIn (que afecta el balance teórico de caja).
        // Para tarjeta/transferencia NO tocamos cardSales/transferSales porque esas
        // métricas solo miden ventas. El movimiento queda registrado en CashTransaction
        // y el manager puede verlo en el detalle del turno.
        if (paymentMethod === 'CASH') {
          await tx.cashShift.update({
            where: { id: activeShift.id },
            data: { cashIn: { increment: amount } },
          });
        }
        // CARD/TRANSFER: el CashTransaction.IN ya lo registra. No se toca cardSales.
      }

      return updatedCustomer;
    });
  }
}
