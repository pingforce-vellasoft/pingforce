# Tenant Self-Signup + Free-Trial Flow — Implementation Plan

**Created:** 2026-07-18
**Status:** In progress — Part 1 (API)
**Decisions (locked by product owner):**

- Free trial: **no card**, instant 30-day trial. On day 30 → prompt to subscribe or suspend.
- Provision point: tenant + admin created **at signup form submit** as `PROVISIONING`; email
  verification flips tenant → `ACTIVE`. (MultiTenant.md §8: only Active tenants authenticate.)
- Password: **auto-generated** for super-admin manual creates; forced reset already wired
  (`mustChangePassword`). Self-signup admin sets own password on the form.
- Build order: **API → Admin → Mobile** (3 parts).

---

## Target flow (pingforce.in)

```
1. Pricing page      GET /public/billing/plans          (+ new "trial" plan)
2. Choose plan       POST /public/billing/checkout
   - paid  → gateway checkout → webhook subscription.activated
   - trial → no gateway, subscription TRIALING, trialEnd = now+30d
3. Signup form       POST /auth/register-tenant  (email + password + workspace name)
   - requires a valid CREATED/TRIALING subscription reference (subscriptionId)
   - creates Tenant status=PROVISIONING, admin user status=ACTIVE
   - links subscription.tenantId to the new tenant (was UNASSIGNED holding)
   - fires verification email (OTP) in background
4. Verify email      POST /auth/verify-email  { subscriptionId|tenantCode, email, otp }
   - on success: tenant.status → ACTIVE
   - send WELCOME email w/ workspace ID (tenant.code) in background
5. Onboarding wizard POST /auth/onboarding/tenant  (mandatory profile + optional whitelabel)
6. Workspace ID shown on dashboard (web + mobile)
```

## API changes (Part 1)

1. **Schema** (`prisma/schema.prisma`)
   - `Plan.trialDays Int @default(0)` — trial length; >0 marks a trial plan.
   - `Tenant.status`: allow `PROVISIONING` (string field, no enum — doc the value).
   - `SubscriptionStatus`: add `TRIALING`.
   - (email verification reuses OTP infra with purpose `EMAIL_VERIFICATION`.)
   - Migration: `npx prisma migrate dev --name tenant_self_signup`

2. **Seed** `prisma/seed-billing-plans.ts` — add `free-trial` plan (amount 0, trialDays 30,
   isCustom false, not gateway-routed).

3. **Billing** `subscriptions.service.ts`
   - `createCheckout`: if `plan.trialDays > 0` → create `TenantSubscription` status `TRIALING`,
     `trialEnd = now + trialDays`, no gateway; return `{ mode: 'trial', subscriptionId }`.

4. **Tenants** `tenants.service.ts`
   - `create`: drop mandatory `adminPassword`; auto-generate via CSPRNG when absent
     (`crypto.randomInt`, policy-compliant), keep `mustChangePassword: true`.
   - Add `generateTempPassword()` helper (or shared util).

5. **Auth** `auth.service.ts` + `auth.controller.ts`
   - `registerTenant`: accept optional `subscriptionId`; if present, validate sub is
     `CREATED`/`TRIALING`/`ACTIVE` and unassigned, create tenant `PROVISIONING`, re-link sub.
     If no sub → keep behaviour behind `SELF_SIGNUP_OPEN` flag (default off).
   - Do NOT return tokens until email verified (tenant is PROVISIONING → login blocked).
   - `@Throttle` on `register-tenant` (was missing).
   - New `verifyEmail(subscriptionId|tenantCode, email, otp)`: verify OTP, tenant → ACTIVE,
     send welcome email w/ workspace ID.
   - New `POST /auth/verify-email` (public, throttled).
   - Move welcome email from creation-time to post-verification.

6. **Dashboard** expose `workspaceId` (tenant.code) + `workspaceName` in the dashboard/me payload.

## Admin (Part 2) — later
Pricing page, checkout, signup form, verify-email screen, onboarding wizard incl. white-label,
workspace ID on dashboard header.

## Mobile (Part 3) — later
Workspace ID on home/dashboard screen. (Signup is web-only; mobile is login + workspace display.)

## Notes
- Billing infra already exists: Plan, TenantSubscription, PaymentTransaction, Razorpay/Stripe
  providers, idempotent webhooks. Only the trial path + provisioning-on-signup link are new.
- `UNASSIGNED` holding tenant already seeded for pre-tenant checkouts.
