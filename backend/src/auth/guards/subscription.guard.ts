import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      return true; // Si no hay usuario logueado en la request, delegar al JwtAuthGuard
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      throw new HttpException('Establecimiento no encontrado.', HttpStatus.NOT_FOUND);
    }

    // Permitir acceso por defecto si no está configurado Stripe aún (Desarrollo local / Trial Inicial)
    if (!tenant.subscriptionStatus) {
      return true;
    }

    const allowedStatuses = ['active', 'trialing'];
    if (!allowedStatuses.includes(tenant.subscriptionStatus)) {
      throw new HttpException(
        'Suscripción vencida o suspendida por falta de pago.',
        HttpStatus.PAYMENT_REQUIRED, // Retorna código HTTP 402
      );
    }

    return true;
  }
}
