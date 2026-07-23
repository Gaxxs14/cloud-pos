import "dotenv/config";
import { PrismaClient, Role, PaymentMethod, SaleStatus, InventoryLogReason } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database...');
  // Delete in order due to foreign keys
  await prisma.inventoryLog.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('Creating Tenant (Tienda Demo)...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Supermercado Demo',
      slug: 'super-demo',
      plan: 'premium',
      isActive: true,
    },
  });

  console.log('Creating Users...');
  const salt = bcrypt.genSaltSync(10);
  
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Administrador Demo',
      email: 'admin@cloudpos.com',
      passwordHash: bcrypt.hashSync('admin123', salt),
      role: Role.OWNER,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Cajero Demo',
      email: 'cajero@cloudpos.com',
      passwordHash: bcrypt.hashSync('cajero123', salt),
      role: Role.CASHIER,
    },
  });

  console.log('Creating Categories...');
  const catBebidas = await prisma.category.create({
    data: { tenantId: tenant.id, name: 'Bebidas' },
  });
  const catSnacks = await prisma.category.create({
    data: { tenantId: tenant.id, name: 'Snacks y Dulces' },
  });
  const catLimpieza = await prisma.category.create({
    data: { tenantId: tenant.id, name: 'Limpieza' },
  });

  console.log('Creating Products...');
  const prod1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catBebidas.id,
      name: 'Coca Cola 600ml',
      skuBarcode: '7501055300010',
      costPrice: 12.00,
      sellPrice: 18.50,
      stock: 50,
      minStock: 10,
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catBebidas.id,
      name: 'Agua Purificada 1L',
      skuBarcode: '7501055304040',
      costPrice: 6.00,
      sellPrice: 11.00,
      stock: 100,
      minStock: 15,
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catSnacks.id,
      name: 'Papas Fritas Originales 100g',
      skuBarcode: '7501011115858',
      costPrice: 15.00,
      sellPrice: 24.00,
      stock: 30,
      minStock: 5,
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catLimpieza.id,
      name: 'Detergente Multiusos 1Kg',
      skuBarcode: '7501020304050',
      costPrice: 22.50,
      sellPrice: 35.00,
      stock: 20,
      minStock: 5,
    },
  });

  console.log('Creating Customer...');
  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Juan Pérez',
      taxId: 'XAXX010101000',
      phone: '5551234567',
      email: 'juan.perez@example.com',
    },
  });

  console.log('Creating initial inventory logs...');
  await prisma.inventoryLog.createMany({
    data: [
      { tenantId: tenant.id, productId: prod1.id, userId: owner.id, quantity: 50, reason: InventoryLogReason.RESTOCK },
      { tenantId: tenant.id, productId: prod2.id, userId: owner.id, quantity: 100, reason: InventoryLogReason.RESTOCK },
      { tenantId: tenant.id, productId: prod3.id, userId: owner.id, quantity: 30, reason: InventoryLogReason.RESTOCK },
      { tenantId: tenant.id, productId: prod4.id, userId: owner.id, quantity: 20, reason: InventoryLogReason.RESTOCK },
    ]
  });

  console.log('Creating a demo Sale...');
  const sale = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      userId: cashier.id,
      customerId: customer.id,
      totalAmount: 48.00, // 2 Coca Cola (37.00) + 1 Agua (11.00) = 48.00
      taxAmount: 6.62, // approx 16% IVA
      discountAmount: 0.00,
      paymentMethod: PaymentMethod.CASH,
      status: SaleStatus.COMPLETED,
    },
  });

  console.log('Creating Sale Items...');
  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale.id,
        productId: prod1.id,
        quantity: 2,
        unitPrice: 18.50,
        discount: 0.00,
        subtotal: 37.00,
      },
      {
        saleId: sale.id,
        productId: prod2.id,
        quantity: 1,
        unitPrice: 11.00,
        discount: 0.00,
        subtotal: 11.00,
      },
    ]
  });

  // Deduct stock for the sold products
  await prisma.product.update({
    where: { id: prod1.id },
    data: { stock: { decrement: 2 } },
  });

  await prisma.product.update({
    where: { id: prod2.id },
    data: { stock: { decrement: 1 } },
  });

  // Log inventory deduction
  await prisma.inventoryLog.createMany({
    data: [
      { tenantId: tenant.id, productId: prod1.id, userId: cashier.id, quantity: -2, reason: InventoryLogReason.SALE },
      { tenantId: tenant.id, productId: prod2.id, userId: cashier.id, quantity: -1, reason: InventoryLogReason.SALE },
    ]
  });

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
