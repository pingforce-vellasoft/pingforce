-- Tenant self-signup + no-card free-trial support.

-- New subscription state for no-card trials (PG16 allows ADD VALUE in a txn).
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING';

-- Free-trial length in days on the plan catalog. 0 = paid plan.
ALTER TABLE "plans" ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 0;
