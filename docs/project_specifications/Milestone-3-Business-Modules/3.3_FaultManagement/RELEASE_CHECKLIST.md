# Fault Management — CI-first release checklist

Updated: 2026-09-15. Full tests and production builds run in GitHub Actions,
not on the development laptop.

## Before deployment

- Review the combined attendance/auth/fault changes on the working branch.
- Push the reviewed branch and open a pull request targeting `main`.
- Wait for both **CI** and **Flutter Mobile Build** to pass on the PR commit.
  CI covers lint/tests/production builds, PostgreSQL migrations/schema drift,
  seed idempotency/permission backfill, and security scans. Flutter covers
  analysis, the complete test suite, APK and AAB generation.
- Check that the new `FAULTS:MANAGE_SLA` grant reaches existing tenant admins
  but not employee roles; custom roles require an explicit grant.
- Confirm the fault migration is not already applied before changing it.
- On the target database, preflight the new timeline uniqueness constraint:

  ```sql
  SELECT "faultId", "clientRef", COUNT(*)
  FROM fault_timelines
  WHERE "clientRef" IS NOT NULL
  GROUP BY "faultId", "clientRef"
  HAVING COUNT(*) > 1;
  ```

  The result must be empty. Do not silently delete duplicate history; review
  any returned records before migration.
- Confirm a restorable pre-deploy database backup, storage availability,
  Redis/queue health and test accounts for admin, technician and customer.

## Deployment

Human approval is required before merging. A merge/push to `main` triggers
production OCI API deployment and Firebase frontend deployment. The CI
workflow's manual dispatch also targets production; do not use it merely to
validate a development branch.

The API and migration containers use the immutable commit image. Prisma
migration/seed success gates API startup. Health checks cover both
`admin-api.pingforce.in` and `api.pingforce.in`.

## Post-deployment smoke/UAT

Use dedicated test records/accounts, not live customer work.

1. Admin: create a fault, assign a technician, search/page queues and set SLA.
2. Technician: see only own work; create online and offline, reconnect/replay
   once, start work, hold/resume and resolve with a note.
3. Verify SLA pause/deadline, timeline entries and assignment/status notices.
4. Customer: raise/track/comment, see only published evidence, reopen within
   the window, then rate closure once.
5. Negative checks: another tenant/technician/customer cannot read or mutate
   those records/files; a technician cannot configure tenant SLA policies.
6. Review API/queue/storage errors and report failures with the request ID.

Fix observed bugs on a review branch, rerun CI and repeat the affected smoke
journey. Do not mark the module complete until CI, UAT and Product Owner
approval are recorded. Roll back to the last known-good API image only when
compatible with the migrated schema; never reset/drop production data.
