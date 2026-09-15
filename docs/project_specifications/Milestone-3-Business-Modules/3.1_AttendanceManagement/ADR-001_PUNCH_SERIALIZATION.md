# ADR-001 — Attendance Punch Serialization

**Status:** Accepted
**Date:** 2026-09-14

## Context

Attendance permits only one open session per employee. Two simultaneous punch
requests can both observe “no open session” before either creates one. Prisma
cannot express the required PostgreSQL partial unique constraint through the
schema DSL because the invariant applies only where `punchOut IS NULL`.

## Decision

Online and offline punch transactions acquire a PostgreSQL transaction-scoped
advisory lock keyed by `(tenantId, employeeId)` before reading or mutating the
attendance day/session. The lock is invoked through Prisma's tagged-template
`$executeRaw` API, so values remain parameterized.

All other reads and writes continue through Prisma. The lock is released
automatically at transaction completion.

## Consequences

- Concurrent punches for different employees remain independent.
- Concurrent punches for the same employee are serialized and cannot create
  two open sessions.
- PostgreSQL is an explicit dependency of this implementation.
- Tests must mock `$executeRaw`; integration/E2E validation must exercise the
  race against PostgreSQL, not only unit-test mocks.
