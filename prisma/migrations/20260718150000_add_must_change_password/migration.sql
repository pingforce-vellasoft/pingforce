-- AlterTable: force a password rotation on first login for admin-provisioned accounts
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
