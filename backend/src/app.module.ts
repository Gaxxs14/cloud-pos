import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { ShiftsModule } from './shifts/shifts.module';
import { BranchesModule } from './branches/branches.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { TransfersModule } from './transfers/transfers.module';
import { CustomersModule } from './customers/customers.module';
import { BillingModule } from './billing/billing.module';
import { ReportsModule } from './reports/reports.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { CategoriesModule } from './categories/categories.module';
import { UsersModule } from './users/users.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    SalesModule,
    ShiftsModule,
    BranchesModule,
    WarehousesModule,
    TransfersModule,
    CustomersModule,
    BillingModule,
    ReportsModule,
    ExchangeRatesModule,
    CategoriesModule,
    UsersModule,
    SuppliersModule,
    PurchasesModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
