# PingForce Test Logins & Workspace IDs

## Setup (run once)

```bash
# 1. Create Super Admin
SEED_SUPER_ADMIN_EMAIL=superadmin@pingforce.in \
SEED_SUPER_ADMIN_PASSWORD=Test@123 \
npx prisma db seed

# 2. Create tenant users + customer
npx ts-node create_test_users.ts
```

## Test Accounts

| Role | Email | Password | Account Type | Workspace ID | Surface |
|---|---|---|---|---|---|
| **Super Admin** | `superadmin@pingforce.in` | `Test@123` | SuperAdmin (platform) | N/A (platform-level) | Web: https://admin.pingforce.in |
| **Tenant Admin** | `manager@pingforce.in` | `Test@123` | User (tenant) | {first-tenant-id} | Web: https://admin.pingforce.in |
| **Employee 1** | `employee@pingforce.in` | `Test@123` | User (tenant) | {first-tenant-id} | Mobile APK |
| **Employee 2** | `employee2@pingforce.in` | `Test@123` | User (tenant) | {first-tenant-id} | Mobile APK |
| **Customer** | `customer@pingforce.in` | `Test@123` | CustomerPortalUser | {first-tenant-id} | API: `/api/v1/portal/*` (Swagger) |

## Find Workspace IDs

After seeding, query to get the actual tenant ID:

```bash
node get-test-ids.js
```

Or manually:

```bash
PGPASSWORD=pingforce_password \
psql -h localhost -p 5433 -U pingforce_user -d pingforce_db \
-c "SELECT id, name, code FROM \"Tenant\" LIMIT 1;"
```

The `id` field is your **workspace ID** — all tenant users and customers belong to it.

## Login Routes

### Web (Super Admin / Tenant Admin)

1. Go to https://admin.pingforce.in
2. Enter email + password
3. Platform detects account type
   - Super Admin → lands on Platform dashboard (Tenants, Subscriptions, Settings)
   - Tenant Admin → lands on Tenant dashboard (CRM, Workforce, Network, Finance)

### Mobile (Employee)

1. Install APK: `PingForce-Mobile-Release-APK` (GitHub Actions artifact)
2. App auto-resolves tenant on splash screen
3. Login with employee email + password
4. Grant location + notification permissions
5. Lands on employee home (Attendance, Visits, Faults, etc.)

### API (Customer — Swagger)

1. Go to https://api.pingforce.in/api/docs
2. Find `POST /api/v1/portal/auth/login`
3. Body: `{ "email": "customer@pingforce.in", "password": "Test@123" }`
4. Copy `accessToken` from response
5. Click green **Authorize** button (top right) → paste token
6. Now all `/portal/*` endpoints are authenticated

## Role Permissions Summary

| Role | Web Access | Mobile Access | API Access |
|---|---|---|---|
| **Super Admin** | Platform mgmt (tenants, subs, settings) | N/A | Super admin endpoints (if any) |
| **Tenant Admin** | Tenant admin portal (all modules) | Manager dashboard | N/A |
| **Employee** | N/A | Field staff app (own records only) | N/A |
| **Customer** | N/A | N/A | Portal API only (`/portal/*`) |

## Notes

- All accounts created in the **same tenant** (first one, or the one you create).
- Password `Test@123` is test-only; use strong password in production.
- Super Admin is platform-level (not scoped to a tenant).
- Tenant Admin, Employees, and Customers all belong to the same tenant.
- Customer portal web/mobile UI not yet built; test via Swagger only.