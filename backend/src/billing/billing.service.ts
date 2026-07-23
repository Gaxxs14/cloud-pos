import { Injectable, NotFoundException, BadRequestException, RawBodyRequest } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_pos_saas_billing', {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  async getBillingStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado.');
    }

    return tenant;
  }

  async createCheckoutSession(priceId: string, tenantId: string, userEmail: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado.');
    }

    let customerId = tenant.stripeCustomerId;

    if (!customerId) {
      // Si no existe el cliente en Stripe, lo creamos
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: { tenantId },
      });
      customerId = customer.id;

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/billing?canceled=true`,
      metadata: { tenantId },
    });

    return { url: session.url };
  }

  async createPortalSession(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.stripeCustomerId) {
      throw new BadRequestException('No tienes un registro de facturación de Stripe asociado aún.');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string | undefined, rawBody: Buffer) {
    let event: Stripe.Event;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      if (webhookSecret && signature) {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } else {
        // En desarrollo si no se tiene webhookSecret configurado
        event = JSON.parse(rawBody.toString());
      }
    } catch (err: any) {
      throw new BadRequestException(`Firma de Webhook no válida: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const subscriptionId = session.subscription as string;

        if (tenantId && subscriptionId) {
          const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
          await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
              stripeSubscriptionId: subscriptionId,
              stripePriceId: (subscription as any).items.data[0].price.id,
              subscriptionStatus: (subscription as any).status,
              subscriptionEndsAt: new Date((subscription as any).current_period_end * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const tenant = await this.prisma.tenant.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (tenant) {
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              subscriptionStatus: subscription.status,
              subscriptionEndsAt: new Date((subscription as any).current_period_end * 1000),
            },
          });
        }
        break;
      }
    }

    return { received: true };
  }
}
