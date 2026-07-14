# Permissions.md

# Enterprise Workforce Platform
## Core Platform – RBAC Module
### Permission Management Specification

**Module:** Core Platform → RBAC
**Document:** Permission Management
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

This document defines the Permission Management subsystem for the Enterprise Workforce Platform.

Permissions are the atomic authorization units used by the RBAC engine to determine whether an authenticated identity may perform a specific action on a protected resource.

Permission evaluation is performed entirely on the server and is mandatory for every secured API, web screen, mobile action, workflow transition and background process.

---

# 2. Objectives

The Permission Management subsystem shall:

- Provide fine-grained authorization.
- Support tenant-aware permissions.
- Support reusable permission groups.
- Support feature/module enablement.
- Prevent privilege escalation.
- Integrate with Authentication, RBAC and Multi-Tenant.
- Maintain immutable audit history.

---

# 3. Authorization Model

Hierarchy:

Tenant
→ User
→ Role(s)
→ Permission Group(s)
→ Permission(s)
→ Resource
→ Action

Default decision = DENY

Access is granted only when an explicit allow exists and no explicit deny applies.

---

# 4. Permission Components

Each permission contains:

- Permission ID
- Permission Code
- Module
- Resource
- Action
- Description
- Category
- Status
- System Permission Flag
- Tenant Scope
- Created/Updated Metadata

Permission codes are immutable.

---

# 5. Naming Convention

Format:

MODULE:RESOURCE:ACTION

Examples:

AUTH:LOGIN:EXECUTE

AUTH:USER:READ

AUTH:USER:UPDATE

RBAC:ROLE:CREATE

RBAC:ROLE:DELETE

ATTENDANCE:CHECKIN:CREATE

ATTENDANCE:REPORT:EXPORT

GPS:TRACKING:READ

FAULT:TICKET:ASSIGN

LEAD:PIPELINE:UPDATE

REPORT:DASHBOARD:VIEW

SETTINGS:TENANT:CONFIGURE

---

# 6. Standard Actions

CRUD

- CREATE
- READ
- UPDATE
- DELETE

Business

- APPROVE
- ASSIGN
- REASSIGN
- REJECT
- VERIFY
- CLOSE
- REOPEN

Administrative

- EXPORT
- IMPORT
- CONFIGURE
- EXECUTE
- AUDIT

Future actions may be introduced without breaking existing permission identifiers.

---

# 7. Permission Categories

Platform

Authentication

RBAC

User Management

Attendance

GPS

Fault Management

Lead Management

Reports

Notifications

Workflow

Settings

Administration

Audit

AI Services

---

# 8. Permission Groups

Permission groups simplify role assignment.

Examples:

Attendance Manager

Contains:

- ATTENDANCE:CHECKIN:READ
- ATTENDANCE:CHECKIN:UPDATE
- ATTENDANCE:REPORT:VIEW
- ATTENDANCE:REPORT:EXPORT

Fault Supervisor

Contains ticket management permissions.

Groups are reusable but evaluated as individual permissions.

---

# 9. Business Rules

BR-PERM-001

Permission codes are globally unique.

BR-PERM-002

System permissions cannot be modified by tenants.

BR-PERM-003

Custom tenant permissions are allowed only within tenant-owned resources.

BR-PERM-004

Disabled permissions cannot be granted.

BR-PERM-005

Module-disabled permissions are automatically denied.

BR-PERM-006

Explicit deny overrides explicit allow.

---

# 10. Permission Evaluation

Evaluation order:

1. JWT validated
2. Tenant active
3. User active
4. Module enabled
5. Resource exists
6. Permission exists
7. Explicit deny
8. Explicit allow

Result:

ALLOW or DENY

Every authorization failure is auditable.

---

# 11. Feature Flag Integration

Permissions operate together with feature flags.

Decision:

Feature Disabled
→ DENY

Feature Enabled
→ Evaluate Permission

This prevents access to disabled modules even if a permission exists.

---

# 12. APIs

GET    /api/v1/rbac/permissions

GET    /api/v1/rbac/permissions/{id}

POST   /api/v1/rbac/permissions

PUT    /api/v1/rbac/permissions/{id}

PATCH  /api/v1/rbac/permissions/{id}/status

GET    /api/v1/rbac/permission-groups

POST   /api/v1/rbac/permission-groups

POST   /api/v1/rbac/check

---

# 13. Suggested Database Model

Tables:

permissions

permission_groups

group_permissions

role_permissions

permission_history

Recommended indexes:

tenant_id

permission_code

module

resource

status

---

# 14. Security Controls

Mandatory:

- Server-side authorization only
- Never trust client UI visibility
- Immutable permission codes
- Tenant isolation
- Audit every administrative change
- Optimistic locking
- Input validation

---

# 15. Audit Events

Permission Created

Permission Updated

Permission Disabled

Permission Assigned

Permission Removed

Permission Group Created

Permission Group Modified

Authorization Failure

---

# 16. Error Codes

PERM-001 Permission Not Found

PERM-002 Permission Already Exists

PERM-003 System Permission Protected

PERM-004 Invalid Module

PERM-005 Module Disabled

PERM-006 Permission Denied

PERM-007 Tenant Mismatch

---

# 17. Performance Targets

Permission lookup: <20 ms

Authorization evaluation: <10 ms

Permission assignment: <100 ms

Permission group expansion: <30 ms

---

# 18. Testing Strategy

Unit Tests

- Permission validation
- Code uniqueness
- Evaluation logic
- Explicit deny precedence

Integration Tests

- Role → Permission mapping
- Feature flag interaction
- Tenant isolation
- API authorization

Security Tests

- Privilege escalation
- Horizontal access
- Vertical access
- Direct API access

Load Tests

- Large permission catalogs
- Concurrent authorization requests
- High-volume API traffic

---

# 19. Acceptance Criteria

✓ Immutable permission identifiers

✓ Module/resource/action model implemented

✓ Permission groups supported

✓ Explicit deny precedence enforced

✓ Feature flag integration operational

✓ Tenant isolation maintained

✓ Audit trail complete

✓ Automated tests passing

---

# 20. Dependencies

- RBAC.md
- Roles.md
- Authentication
- JWT
- Multi-Tenant
- User Management
- Feature Flags
- Audit Logging

---

# 21. Related Documents

- Authentication.md
- LoginFlow.md
- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Permission Management specification for the Enterprise Workforce Platform RBAC module.
