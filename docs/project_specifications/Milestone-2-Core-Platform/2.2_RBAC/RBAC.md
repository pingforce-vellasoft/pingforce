# RBAC.md

# Enterprise Workforce Platform

## Core Platform – Role Based Access Control (RBAC) Specification

**Module:** Core Platform → RBAC  
**Version:** 1.0.0  
**Status:** Approved for Architecture & Detailed Design

---

# 1. Purpose

Role Based Access Control (RBAC) provides centralized authorization across every module of the Enterprise Workforce Platform.

Authentication answers **"Who are you?"**

RBAC answers **"What are you allowed to do?"**

The authorization engine is mandatory for all web, mobile, API, background jobs and integrations.

---

# 2. Objectives

The RBAC subsystem shall:

- Enforce least privilege.
- Support multi-tenant authorization.
- Support unlimited roles.
- Allow multiple roles per user.
- Support module-level permissions.
- Support action-level permissions.
- Integrate with JWT authentication.
- Maintain complete audit history.

---

# 3. Authorization Model

Authorization hierarchy

Tenant
→ User
→ Roles
→ Permissions
→ Resources
→ Actions

Every authorization decision is tenant scoped.

---

# 4. Core Concepts

## Users

A user may have one or more roles.

## Roles

Examples:

- Platform Super Admin
- Tenant Admin
- Manager
- Supervisor
- Employee
- Field Staff
- Client

## Resources

Examples:

- Users
- Attendance
- GPS
- Fault Tickets
- Leads
- Reports
- Settings

## Actions

- Create
- Read
- Update
- Delete
- Approve
- Assign
- Export
- Import
- Configure

---

# 5. Permission Structure

Permission format:

MODULE:RESOURCE:ACTION

Examples:

AUTH:USER:READ

ATTENDANCE:CHECKIN:CREATE

FAULT:TICKET:ASSIGN

REPORT:EXPORT:EXECUTE

Permissions must be immutable identifiers.

---

# 6. Role Assignment Rules

Business Rules:

- Users may have multiple roles.
- Roles belong to a tenant.
- Platform roles cannot be modified by tenant users.
- Tenant custom roles are supported.
- Explicit deny overrides allow.
- Disabled roles grant no permissions.

---

# 7. Authorization Flow

1. JWT validated.
2. Tenant resolved.
3. User loaded.
4. Active roles retrieved.
5. Permissions resolved.
6. Requested resource evaluated.
7. Decision returned.
8. Audit event recorded.

---

# 8. Multi-Tenant Rules

- Roles are tenant isolated.
- Permission lookups are tenant scoped.
- Cross-tenant role assignment is prohibited.
- Super Admin permissions are evaluated within platform governance.

---

# 9. Data Model

Core tables:

roles
permissions
role_permissions
user_roles
permission_groups
audit_logs

Mandatory columns:

tenant_id
created_at
updated_at
created_by
updated_by

---

# 10. API Endpoints

GET /api/v1/rbac/roles

POST /api/v1/rbac/roles

PUT /api/v1/rbac/roles/{id}

DELETE /api/v1/rbac/roles/{id}

GET /api/v1/rbac/permissions

POST /api/v1/rbac/users/{id}/roles

DELETE /api/v1/rbac/users/{id}/roles/{roleId}

POST /api/v1/rbac/check

---

# 11. Permission Evaluation

Evaluation order:

1. User active
2. Tenant active
3. Module enabled
4. Role active
5. Permission exists
6. Explicit deny
7. Explicit allow

Default outcome:

DENY

---

# 12. Security Controls

Mandatory:

- Server-side authorization
- Never trust client permissions
- Audit every administrative change
- Parameter validation
- Tenant isolation
- JWT validation before authorization

---

# 13. Audit Events

- Role Created
- Role Updated
- Role Deleted
- Permission Assigned
- Permission Removed
- User Role Assigned
- User Role Revoked
- Authorization Failure

---

# 14. Error Codes

RBAC-001 Permission Denied

RBAC-002 Role Not Found

RBAC-003 Permission Not Found

RBAC-004 Invalid Tenant

RBAC-005 User Inactive

RBAC-006 Module Disabled

---

# 15. Performance Targets

Permission lookup: <20 ms

Authorization decision: <10 ms

Role assignment: <100 ms

---

# 16. Testing Strategy

Unit Tests

- Permission resolution
- Role inheritance
- Explicit deny

Integration Tests

- API authorization
- Tenant isolation
- Role assignment

Security Tests

- Privilege escalation
- Horizontal access
- Vertical access
- JWT tampering

Load Tests

- Concurrent authorization
- Large role sets

---

# 17. Acceptance Criteria

✓ Multiple roles supported

✓ Tenant isolation enforced

✓ Permission evaluation deterministic

✓ Unauthorized access denied

✓ Administrative actions audited

✓ Automated tests passing

---

# 18. Dependencies

- Authentication
- JWT
- Session Management
- Multi-Tenant
- User Management
- Security Framework

---

# 19. Related Documents

- Authentication.md
- LoginFlow.md
- JWT.md
- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative RBAC functional specification for the Enterprise Workforce Platform.
