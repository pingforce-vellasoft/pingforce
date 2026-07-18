# Production Test Login Setup

Run these on the OCI server (SSH in first). No prod credentials leave the server.

## 1. SSH into server, find compose project

```bash
ssh <user>@<oci-server-ip>
cd /opt/pingforce   # or wherever docker-compose.prod.yml lives
```

## 2. Create Super Admin

Actual running container names (confirm with `docker ps`, may not match the
`container_name:` in the repo's compose file if server deployed an older
version):

```bash
docker exec -e SEED_SUPER_ADMIN_EMAIL=superadmin@pingforce.in \
            -e SEED_SUPER_ADMIN_PASSWORD='Admin@PingForce123!' \
            pingforce-api-1 npx prisma db seed
```

Confirms with: `Upserted super admin user: superadmin@pingforce.in`

## 3. Find or create a real tenant with a known workspace code

Check what tenants already exist (don't guess "DEFAULT"):

```bash
docker exec pingforce-postgres-1 psql -U pingforce -d pingforce_db \
  -c 'SELECT id, code, name, status FROM "Tenant";'
```

- If a tenant exists → **use its `code` as Workspace ID** on the login screen.
- If none exists → register one properly through the UI/API (don't hand-insert
  rows — registration also provisions roles/permissions for that tenant):
  ```bash
  curl -X POST https://api.pingforce.in/api/v1/auth/register-tenant \
    -H 'Content-Type: application/json' \
    -d '{
      "companyName": "UAT Test Co",
      "tenantCode": "uat-test",
      "adminEmail": "manager@pingforce.in",
      "adminPassword": "Test@123",
      "adminFirstName": "Tenant",
      "adminLastName": "Admin"
    }'
  ```
  Check `apps/api/src/auth/dto/register-tenant.dto.ts` for exact required
  fields if this 400s.

## 4. Create employee + customer test accounts in that tenant

Edit `create_test_users.ts` locally to target the **known tenant code** (not
`findFirst`, which grabs whatever tenant happens to be first) — or run it
directly on the server against `DATABASE_URL` already pointed at prod:

```bash
docker cp create_test_users.ts pingforce-api-1:/app/create_test_users.ts
docker exec pingforce-api-1 npx ts-node /app/create_test_users.ts
```

## 5. Get the workspace ID (tenant code) for the login screen

```bash
docker exec pingforce-postgres-1 psql -U pingforce -d pingforce_db \
  -c 'SELECT code FROM "Tenant" WHERE name = '"'"'UAT Test Co'"'"';'
```

Whatever `code` comes back (e.g. `uat-test`) — **that** goes in the "Workspace
ID (Tenant)" field, not "DEFAULT".

## 6. Login matrix (after steps above)

| Role | Workspace ID field | Email | Password |
|---|---|---|---|
| Super Admin | **leave blank** | `superadmin@pingforce.in` | (chosen in step 2) |
| Tenant Admin | `uat-test` (your actual tenant code) | `manager@pingforce.in` | `Test@123` |
| Employee | `uat-test` | `employee@pingforce.in` | `Test@123` |
| Customer | N/A — use Swagger `/portal/auth/login`, no workspace field | `customer@pingforce.in` | `Test@123` |

**Why "DEFAULT" failed:** the login form's Workspace ID box is literal —
whatever you type is looked up as `Tenant.code`. There is no tenant named
"DEFAULT" unless one was explicitly created with that code. Super Admin login
is the only one where this field must be **empty** — filling anything in
routes it into tenant-user login instead (confirmed in
`apps/api/src/auth/auth.service.ts:39-44`).