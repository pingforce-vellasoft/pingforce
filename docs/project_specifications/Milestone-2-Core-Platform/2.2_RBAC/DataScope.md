# DataScope.md

# Enterprise Workforce Platform

## Core Platform – RBAC Module

### Data Scope & Record-Level Authorization Specification

**Module:** Core Platform → RBAC
**Document:** Data Scope
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

Data Scope defines **which records** a user is allowed to access after authentication, authorization, and field-level permission checks have succeeded.

While RBAC determines **what operations** a user may perform, Data Scope determines **which data** those operations apply to.

Every query, report, dashboard, API, export, workflow, and background process must apply Data Scope filtering.

---

# 2. Objectives

The subsystem shall:

- Enforce tenant isolation.
- Restrict record visibility.
- Support hierarchical organizations.
- Support manager/team visibility.
- Support ownership-based access.
- Support configurable tenant policies.
- Prevent data leakage.
- Produce auditable authorization decisions.

---

# 3. Authorization Layers

Authentication
→ Tenant Validation
→ RBAC Permission
→ Menu/Screen Permission
→ Field Permission
→ Data Scope
→ Business Rules

A request is permitted only when every layer succeeds.

---

# 4. Data Scope Levels

| Scope         | Description                                   |
| ------------- | --------------------------------------------- |
| SELF          | User's own records only                       |
| TEAM          | Records owned by direct reports               |
| DEPARTMENT    | Department records                            |
| REGION        | Geographic region                             |
| BUSINESS_UNIT | Business unit                                 |
| TENANT        | Entire tenant                                 |
| PLATFORM      | Cross-tenant platform operations (restricted) |
| CUSTOM        | Rule-driven scope                             |

---

# 5. Default Scope by Role

| Role                 | Default Scope                |
| -------------------- | ---------------------------- |
| Platform Super Admin | PLATFORM                     |
| Platform Support     | PLATFORM (limited by policy) |
| Tenant Administrator | TENANT                       |
| Manager              | TEAM                         |
| Supervisor           | TEAM                         |
| Employee             | SELF                         |
| Field Staff          | SELF                         |
| Sales Executive      | SELF / TEAM (configurable)   |
| Client User          | SELF                         |

Tenant administrators may tighten defaults but cannot expand beyond platform governance.

---

# 6. Scope Resolution Algorithm

1. Authenticate user.
2. Resolve tenant.
3. Validate account.
4. Resolve active roles.
5. Evaluate feature flags.
6. Determine effective data scope.
7. Build query filters.
8. Execute data access.
9. Audit the decision.

Default outcome: DENY.

---

# 7. Query Filtering

Every repository/query automatically applies:

- tenant_id
- scope predicate
- status filters
- soft delete filters

Example:

Employee:

WHERE tenant_id = :tenant
AND employee_id = :currentUser

Manager:

WHERE tenant_id = :tenant
AND manager_id = :currentUser

Tenant Admin:

WHERE tenant_id = :tenant

---

# 8. Supported Scope Strategies

## Ownership

Record owner only.

## Reporting Hierarchy

Direct and indirect reports.

## Department

Department membership.

## Region

Assigned operational region.

## Assignment

Assigned tickets, leads, tasks or visits.

## Workflow

Current approver or assignee.

## Hybrid

Combination of multiple rules.

---

# 9. Entity Scope Examples

Users

- Employee → Self
- Manager → Team
- Tenant Admin → Tenant

Attendance

- Employee → Own attendance
- Manager → Team attendance
- HR/Tenant Admin → Tenant attendance

Fault Tickets

- Creator
- Assignee
- Manager
- Tenant Administrator

Leads

- Lead owner
- Assigned salesperson
- Sales manager
- Tenant Administrator

Reports

- Generated using the caller's effective scope.

---

# 10. Organization Hierarchy

Data Scope integrates with:

- Departments
- Reporting managers
- Regions
- Business units
- Teams

Future:

- Matrix organizations
- Temporary delegation
- Acting managers

---

# 11. Temporary Delegation

Future capability:

A manager may delegate scope to another authorized manager.

Rules:

- Time-bound
- Audited
- Revocable
- Tenant-controlled

---

# 12. Database Model

Suggested tables:

data_scopes
role_data_scopes
user_scope_overrides
organization_hierarchy
department_hierarchy
scope_audit

Indexes:

- tenant_id
- user_id
- scope_type
- manager_id

---

# 13. API Behaviour

Every protected API must apply scope before returning data.

Filtering occurs in the service/repository layer.

Clients cannot request broader scope than assigned.

---

# 14. Export Rules

Exports inherit effective data scope.

Examples:

Employee → Own records only.

Manager → Team records.

Tenant Admin → Tenant records.

Platform exports require platform authorization.

---

# 15. Dashboard Rules

Dashboard widgets aggregate only authorized records.

KPIs, counts, and charts must never reveal out-of-scope information.

---

# 16. Security Controls

Mandatory:

- Server-side scope enforcement
- Query parameter validation
- Tenant isolation
- Soft-delete filtering
- Audit logging
- No client-controlled scope parameters
- Defense against insecure direct object references (IDOR)

---

# 17. Audit Events

- Scope Evaluated
- Scope Override Applied
- Delegation Granted
- Delegation Revoked
- Unauthorized Data Access
- Cross-scope Access Attempt

Audit fields:

- tenant_id
- user_id
- entity
- scope
- request_id
- timestamp
- correlation_id

---

# 18. Error Codes

SCOPE-001 Access Outside Scope

SCOPE-002 Invalid Scope

SCOPE-003 Tenant Mismatch

SCOPE-004 Hierarchy Missing

SCOPE-005 Delegation Expired

SCOPE-006 Unauthorized Override

---

# 19. Performance Targets

Scope evaluation: <15 ms

Hierarchy resolution: <30 ms

Repository filtering overhead: <10 ms

Dashboard aggregation: <300 ms

---

# 20. Testing Strategy

Functional

- Self scope
- Team scope
- Department scope
- Tenant scope
- Platform scope

Security

- IDOR attempts
- Cross-tenant access
- Scope escalation
- Query manipulation

Performance

- Large hierarchies
- Millions of records
- Concurrent authorization

---

# 21. Future Enhancements

- Attribute-Based Access Control (ABAC)
- Geographic geofence scope
- Time-based scope
- Project-based scope
- Dynamic policy engine
- AI-assisted anomaly detection

---

# 22. Acceptance Criteria

- Effective scope calculated correctly.
- Repository filtering enforced.
- Tenant isolation maintained.
- Record ownership honored.
- Dashboard metrics scoped.
- Export restrictions enforced.
- Audit trail complete.
- Automated tests passing.

---

# 23. Dependencies

- RBAC.md
- Roles.md
- Permissions.md
- PermissionMatrix.md
- FieldPermissions.md
- ScreenPermissions.md
- Authentication.md
- Multi-Tenant
- User Management

---

# 24. Related Documents

- BUSINESS_RULES.md
- PROJECT_VISION.md
- PRD.md
- TECH_STACK.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Data Scope specification for record-level authorization within the Enterprise Workforce Platform RBAC module.
