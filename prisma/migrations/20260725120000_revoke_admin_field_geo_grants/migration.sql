-- pingforce:allow-destructive reason=Intentional RBAC backfill. Removes only
-- the three field-only grants (ATTENDANCE:CREATE, ATTENDANCE:READ_OWN,
-- VISITS:EXECUTE) from system admin/manager roles, matching
-- FIELD_ONLY_GEO_GRANTS in permission-catalog.ts. Grants are re-derivable from
-- that catalog by re-running provisioning; no tenant data is affected and
-- custom roles are untouched.
--
-- Revoke self-service geolocation grants from office (admin/manager) roles.
--
-- Geolocation attendance (punch in/out) and self-visit execution are scoped to
-- field-employee logins only. Historically ADMIN_MANAGER was granted the ENTIRE
-- tenant catalog, so existing admin/manager roles hold ATTENDANCE:CREATE,
-- ATTENDANCE:READ_OWN and VISITS:EXECUTE — letting an admin login punch check-ins
-- and run visits. Provisioning no longer grants these (see permission-catalog.ts
-- FIELD_ONLY_GEO_GRANTS); this backfill removes them from roles already created.
--
-- Office roles keep oversight (ATTENDANCE:READ/APPROVE, VISITS:READ/ASSIGN/APPROVE,
-- TRACKING:VIEW_LIVE) — only the "perform it myself" actions are removed. Only
-- system admin/manager roles are touched; custom tenant roles are left intact.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND (r."code" = 'ADMIN_MANAGER' OR r."code" LIKE 'ADMIN%' OR r."code" LIKE '%MANAGER%')
  AND (
    (p."module" = 'ATTENDANCE' AND p."action" = 'CREATE')
    OR (p."module" = 'ATTENDANCE' AND p."action" = 'READ_OWN')
    OR (p."module" = 'VISITS' AND p."action" = 'EXECUTE')
  );
