-- pingforce:allow-destructive reason=Intentional RBAC backfill. Widens the
-- system ADMIN_MANAGER role's grants to their provisioned scope (ALL) and drops
-- the field-only ATTENDANCE:READ_OWN grant. Both are re-derivable from
-- ADMIN_MANAGER_GRANTS in permission-catalog.ts; no tenant data is affected and
-- custom roles are untouched.
--
-- Restore ADMIN_MANAGER data scope to ALL.
--
-- ADMIN_MANAGER_GRANTS (permission-catalog.ts) provisions every non-platform
-- permission at dataScope 'ALL' — a tenant admin oversees the whole tenant.
-- Tenants provisioned by an older build received these grants at 'OWN' instead.
--
-- The effect was silent and total: resolveScopeIds returns OWN, and because an
-- admin login has no Employee record, resolveIdsForLevel yields an empty
-- employeeIds list. Every scoped query then filters on `employeeId IN ()` and
-- matches nothing, so admin list screens (attendance logs, daily logs, and
-- every other module resolved this way) render empty against a populated
-- database rather than erroring.
--
-- Restricted to the system role code 'ADMIN_MANAGER'. The broader
-- `LIKE '%MANAGER%'` pattern used by earlier backfills is deliberately NOT used
-- here: widening scope is a privilege change, and a custom tenant role
-- intentionally scoped to OWN must not be silently promoted to ALL.
UPDATE "role_permissions" rp
SET "dataScope" = 'ALL'
FROM "roles" r
WHERE rp."roleId" = r."id"
  AND r."code" = 'ADMIN_MANAGER'
  AND rp."dataScope" = 'OWN';

-- The 20260725120000 backfill removed ATTENDANCE:READ_OWN from admin roles, but
-- tenants provisioned after it by an older API image were granted it again.
-- Office roles hold ATTENDANCE:READ for oversight; READ_OWN is field-only.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."code" = 'ADMIN_MANAGER'
  AND p."module" = 'ATTENDANCE'
  AND p."action" = 'READ_OWN';
