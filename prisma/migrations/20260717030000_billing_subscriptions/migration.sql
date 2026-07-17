-- Billing & Subscriptions module (payment-gateway backed plans, subscriptions,
-- transactions, webhook audit). Gateway-agnostic: Razorpay live, Stripe stub.

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'STRIPE');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('CREATED', 'AUTHENTICATED', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "features" TEXT[],
    "maxFieldStaff" INTEGER,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "razorpayPlanId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'CREATED',
    "gatewaySubscriptionId" TEXT,
    "gatewayCustomerId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "gateway" "PaymentGateway" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayPaymentId" TEXT,
    "gatewayInvoiceId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE INDEX "plans_isActive_idx" ON "plans"("isActive");

CREATE UNIQUE INDEX "tenant_subscriptions_gatewaySubscriptionId_key" ON "tenant_subscriptions"("gatewaySubscriptionId");
CREATE INDEX "tenant_subscriptions_tenantId_idx" ON "tenant_subscriptions"("tenantId");
CREATE INDEX "tenant_subscriptions_planId_idx" ON "tenant_subscriptions"("planId");
CREATE INDEX "tenant_subscriptions_status_idx" ON "tenant_subscriptions"("status");

CREATE UNIQUE INDEX "payment_transactions_gatewayPaymentId_key" ON "payment_transactions"("gatewayPaymentId");
CREATE INDEX "payment_transactions_tenantId_idx" ON "payment_transactions"("tenantId");
CREATE INDEX "payment_transactions_subscriptionId_idx" ON "payment_transactions"("subscriptionId");
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");
CREATE INDEX "payment_transactions_paidAt_idx" ON "payment_transactions"("paidAt");

CREATE UNIQUE INDEX "webhook_events_eventId_key" ON "webhook_events"("eventId");
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events"("processed");

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
