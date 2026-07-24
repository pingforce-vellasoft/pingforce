-- Employee.isFieldStaff — authoritative field-vs-office gate for background
-- location tracking. New column defaults true (most mobile users are field
-- staff); office employees are backfilled to false below.
ALTER TABLE "Employee" ADD COLUMN "isFieldStaff" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: flip office employees to false. "Office" is derived once, here,
-- from the employee's role code — admins/managers punch attendance but are
-- never tracked. Field roles (EMPLOYEE_FIELD_STAFF, technicians, sales, and
-- any custom role that isn't an admin/manager marker) keep the true default.
-- This role guess happens offline at migration time only, never per request.
UPDATE "Employee" e
SET "isFieldStaff" = false
FROM "User" u
JOIN "Role" r ON r."id" = u."roleId"
WHERE e."userId" = u."id"
  AND (
    r."code" = 'ADMIN_MANAGER'
    OR r."code" LIKE 'ADMIN%'
    OR r."code" LIKE '%MANAGER%'
  );
