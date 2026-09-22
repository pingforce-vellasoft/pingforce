# Leave Management

Implementation branch: `feature/leave-management`.

## Behavior

- Employees submit for their JWT-linked employee only, preview chargeable days,
  view balances/history, and withdraw pending requests.
- Pending leave reserves entitlement. Final approval moves reserved days to used;
  rejection/withdrawal releases the reservation. Scoped managers may cancel
  approved leave with a reason, refunding the original stored charge.
- Full-day and first/second-half leave are supported. Half-day requests cover one
  date; complementary halves may coexist, but overlapping halves/full days cannot.
- Cross-year requests are rejected; submit one request per calendar year.
- All entitlement mutations use one serializable transaction with
  up to two retries on Prisma P2034. Workflow advancement, leave status, balance,
  ledger, and audit writes share that transaction.
- A repeated withdrawal/cancellation cannot refund twice. Decisions on terminal
  requests return a conflict and require refreshing the workflow state.
- In-flight requests retain the workflow selected at submission when another
  workflow is activated.
- `approvedBy` is an Employee ID (when the actor has an employee record);
  `updatedBy` and audit actor preserve the authenticated User ID.
- Lists are paginated and tenant-scoped. The legacy employee-balance route now
  rejects attempts to read another employee's balance.

## Calendar policy

The tenant's existing `TenantSetting.metadata.leaveCalendar` supports:

```json
{
  "leaveCalendar": {
    "weekendDays": [0, 6],
    "holidays": ["2026-12-25"]
  }
}
```

Weekday numbers use Sunday=0 through Saturday=6. Configured dates are excluded.
Existing tenants without this configuration retain calendar-day charging; this
avoids silently changing entitlement rules. No calendar administration screen or
per-leave-type calendar override is introduced in this completion slice.
Calculations use date-only UTC values to avoid daylight-saving offsets. Stored
`requestedDays` is authoritative for refunds even after policy changes.

## API additions

All routes are under `/api/v1/leaves` with JWT and RBAC guards.

| Route                | Permission                  | Purpose                                  |
| -------------------- | --------------------------- | ---------------------------------------- |
| `POST /preview`      | `LEAVES:CREATE`             | Return chargeable days without mutation  |
| `POST /request`      | `LEAVES:CREATE`             | Reserve entitlement and submit           |
| `POST /:id/withdraw` | `LEAVES:CREATE` + ownership | Withdraw pending request                 |
| `POST /:id/cancel`   | `LEAVES:APPROVE` + scope    | Cancel approved request; reason required |
| `GET /access`        | `LEAVES:READ`               | UI approval capability                   |
| `GET /pending`       | `LEAVES:READ` + scope       | Filtered queue/history                   |

List inputs: `skip` (nonnegative), `take` (1–100, default 25), `status` (one of
PENDING/APPROVED/REJECTED/CANCELLED). Balance queries accept `year` (2000–2200).
Submission requires UUID leave type, `YYYY-MM-DD` start/end, optional reason and
`duration` (`FULL_DAY`, `FIRST_HALF`, `SECOND_HALF`). Existing approve/reject
routes accept an optional decision reason.

## Notifications

Email/push use tenant-customizable Leave templates and existing retry queues;
in-app events link to Leave. Templates are provisioned without overwriting tenant
customizations. Delivery failures are logged and do not change committed leave.
The reporting manager receives submission notifications when authorized. Named
workflow approvers receive stage notifications. Role/permission-only stage
approvers use the scoped queue (no broad role broadcast in this slice).

## Migration and deployment

`20260920100000_leave_lifecycle` adds reservations, stored charges, duration,
decision/cancellation fields, and an immutable balance ledger. Existing pending
charges move from used to reserved without changing available days. Existing
active requests receive opening ledger records.

The migration fails if historical dates are reversed, active requests cross
years, active requests lack balances, or balances become negative. Reconcile
those records through an approved data repair before deployment; do not bypass
the guards. Run it during a maintenance window with old Leave writers stopped.
Generate the Prisma client before starting the new API. No live database
migration was executed during development.

Ledger rows are append-only through this module; there is no hard-delete endpoint.
SQL in the Prisma migration is schema/backfill work, not application raw SQL.

## Resource-conscious verification

Per the developer's laptop constraint, run only Leave and directly affected
workflow checks, sequentially, with Jest `--runInBand`. Do not run Nx affected,
full API/mobile suites, Angular builds, or API builds on this laptop.

Admin service checks have a dedicated `apps/admin/leave.vitest.config.mts` and do
not start the Angular builder. Mobile checks target `lib/features/leave` and
`test/features/leave` only.

Database-backed concurrency/migration tests, full regression/builds, CI, and real
device UAT remain release gates for a suitable CI runner or test environment.
Passing the lightweight checks is not production sign-off.

### Verified checkpoint — 2026-09-21

- Six targeted backend suites: 79 tests passed, run sequentially.
- Leave service/calendar coverage: 98.28% statements, 92.24% branches,
  96.29% functions, and 99.38% lines. This is scoped coverage, not repository-wide.
- Isolated Angular service tests: 5 passed; template parsing passed.
- Flutter Leave model tests: 4 passed; Leave-only Dart analysis found no issues.
- Prisma client generation and `git diff --check` passed.
- No full build, full test suite, or live database migration was run.
