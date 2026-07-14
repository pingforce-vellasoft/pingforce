
# CODING_STANDARDS.md

# Enterprise Workforce Platform Coding Standards

**Version:** 1.0.0
**Status:** Approved
**Applies To:** Angular, Flutter, NestJS, PostgreSQL, AI Generated Code

---

# 1. Purpose

This document defines mandatory engineering standards for the Enterprise Workforce Platform.

Goals:

- Maintain a single coding style across all repositories.
- Improve readability and maintainability.
- Reduce defects.
- Ensure secure, scalable, testable software.
- Standardize AI-generated code.

These standards are mandatory for every contributor.

---

# 2. Engineering Principles

Every implementation SHALL follow:

- SOLID
- DRY
- KISS
- YAGNI
- Clean Architecture
- Separation of Concerns
- Dependency Injection
- Composition over Inheritance

Business logic must never depend directly on frameworks.

---

# 3. Repository Standards

Repository layout:

frontend/
mobile/
backend/
database/
docs/
infrastructure/
scripts/
tests/

Never mix business logic with infrastructure code.

---

# 4. Naming Conventions

Classes:
PascalCase

Interfaces:
Prefix with I only when required by existing conventions; otherwise descriptive nouns.

Variables:
camelCase

Constants:
UPPER_SNAKE_CASE

Files:

Angular:
employee-list.component.ts

Flutter:
employee_list_screen.dart

NestJS:
attendance.service.ts

Database:
attendance_sessions

---

# 5. TypeScript Standards

- strict mode enabled
- no any
- prefer readonly
- explicit return types
- immutable data where practical
- async/await over promise chains

Example:

BAD

let data:any;

GOOD

const employee: EmployeeDto;

---

# 6. Angular Standards

Use:

- Angular 21
- Standalone Components
- Signals first
- Lazy Loading
- Route Guards
- Feature folders
- Smart/Dumb component separation

Never place API calls directly inside components.

Use Services.

---

# 7. Flutter Standards

Architecture:

Feature
Application
Domain
Infrastructure

State Management:

Riverpod

Packages:

dio
go_router
hive
flutter_secure_storage

Never write business logic inside Widgets.

---

# 8. NestJS Standards

Architecture:

Controllers

↓

Services

↓

Repositories

↓

Prisma

Rules:

- DTO validation
- Dependency Injection
- Modules per feature
- No raw SQL unless justified
- Business logic only in services

---

# 9. PostgreSQL Standards

Primary Keys:

UUID

Mandatory columns:

tenant_id
created_at
updated_at
created_by
updated_by

Soft Delete:

deleted_at

Indexes:

tenant_id
foreign keys
search columns

---

# 10. API Standards

REST only.

Plural resources.

/employees

/faults

/leads

HTTP Status Codes

200
201
204
400
401
403
404
409
422
500

Versioning:

/api/v1

---

# 11. Security Standards

Mandatory:

JWT
RBAC
Tenant Isolation
Parameterized queries
Input validation
HTTPS

Never:

Store secrets in code.

---

# 12. Error Handling

Every error must:

- be logged
- include correlation id
- never expose stack traces
- return standard response

---

# 13. Logging Standards

JSON structured logging.

Include:

timestamp

tenant_id

user_id

request_id

module

severity

---

# 14. Performance

Avoid:

N+1 queries

Large payloads

Repeated API calls

Use:

Pagination

Caching

Compression

Lazy Loading

---

# 15. Testing Standards

Coverage goals

Business Logic

90%

Utilities

95%

Critical Security

100%

Testing:

Unit

Integration

API

E2E

---

# 16. Git Standards

Branches:

feature/

bugfix/

hotfix/

release/

Commits:

Conventional Commits

feat:
fix:
docs:
refactor:
test:

---

# 17. Documentation

Every module requires:

README

API

Database

Architecture

Sequence diagrams

Mermaid diagrams where applicable.

---

# 18. AI Generated Code

Every AI-generated change must undergo:

Architecture Review

Security Review

Performance Review

QA Review

No AI output is merged without human approval.

---

# 19. Code Review Checklist

Reviewer verifies:

✓ Naming

✓ SOLID

✓ Security

✓ Tests

✓ Documentation

✓ Performance

✓ Tenant Isolation

✓ Error Handling

---

# 20. Definition of Done

A feature is complete only if:

- Code implemented
- Tests passing
- Documentation updated
- Security reviewed
- Performance acceptable
- Sonar issues resolved
- CI/CD successful
- Product Owner approved

---

# 21. Anti-patterns

Forbidden:

- God classes
- Circular dependencies
- Magic numbers
- Hardcoded credentials
- SQL injection risks
- Duplicate business logic
- Copy-paste implementations

---

# 22. Governance

Any deviation from this document requires an approved ADR.

This document is mandatory for every repository within the Enterprise Workforce Platform.
