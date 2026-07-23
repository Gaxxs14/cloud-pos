-- CreateEnum
CREATE TYPE "CreditLogType" AS ENUM ('DEBT', 'PAYMENT');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "allow_credit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "credit_limit" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "current_debt" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "customer_credit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "CreditLogType" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_credit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customer_credit_logs" ADD CONSTRAINT "customer_credit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit_logs" ADD CONSTRAINT "customer_credit_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credit_logs" ADD CONSTRAINT "customer_credit_logs_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
