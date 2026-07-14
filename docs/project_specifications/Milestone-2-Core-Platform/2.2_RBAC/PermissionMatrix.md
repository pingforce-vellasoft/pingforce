# PermissionMatrix.md

# Enterprise Workforce Platform
## Core Platform – RBAC Module
### Permission Matrix Specification

**Module:** Core Platform → RBAC
**Document:** Permission Matrix
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Permission Matrix is the authoritative mapping between Roles, Modules, Resources and Actions within the Enterprise Workforce Platform.

It provides a standardized reference for architects, developers, QA engineers, security reviewers and administrators to determine exactly which operations are permitted for each role.

The matrix is a governance document. It is **not** the runtime permission store. Runtime authorization is always evaluated by the RBAC engine.

---

# 2. Objectives

The Permission Matrix shall:

- Define default permissions for every standard role.
- Provide a repeatable authorization model.
- Support multi-tenant isolation.
- Support module enablement and feature flags.
- Reduce permission ambiguity.
- Act as the baseline for tenant customization.
- Enable security audits and compliance reviews.

---

# 3. Permission Evaluation Order

Authorization follows this order:

1. Authentication succeeds.
2. Tenant is resolved.
3. User is active.
4. Module is enabled.
5. Role assignments are loaded.
6. Permission matrix is evaluated.
7. Explicit deny is applied.
8. Explicit allow grants access.
9. Audit event is recorded.

Default decision: **DENY**

---

# 4. Standard Actions

| Action | Description |
|---------|-------------|
| CREATE | Create a new record |
| READ | View data |
| UPDATE | Modify existing data |
| DELETE | Soft delete a record |
| APPROVE | Approve business workflow |
| ASSIGN | Assign work |
| REASSIGN | Reassign work |
| EXPORT | Export reports/data |
| IMPORT | Import data |
| CONFIGURE | Configure settings |
| EXECUTE | Execute business action |
| AUDIT | View audit information |

---

# 5. Standard Platform Roles

| Role | Scope |
|------|-------|
| Platform Super Admin | Entire platform |
| Platform Support | Platform operations |
| Platform Auditor | Read-only platform visibility |
| Platform DevOps | Infrastructure |
| Tenant Administrator | Single tenant administration |
| Manager | Department/team |
| Supervisor | Operational supervision |
| Employee | Standard workforce user |
| Field Staff | Field operations |
| Sales Executive | Sales & lead management |
| Customer Support | Fault handling |
| Client User | Customer portal |
| Read Only | Reporting only |

---

# 6. Module Permission Matrix

## Authentication

| Role | Login | Logout | Password Reset | Manage Users |
|------|:----:|:------:|:--------------:|:------------:|
| Platform Super Admin | ✓ | ✓ | ✓ | ✓ |
| Tenant Administrator | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ (self) | ✗ |
| Employee | ✓ | ✓ | ✓ (self) | ✗ |
| Client User | ✓ | ✓ | ✓ (self) | ✗ |

---

## RBAC

| Role | Roles | Permissions | Assign Roles | Configure |
|------|:-----:|:-----------:|:------------:|:---------:|
| Platform Super Admin | ✓ | ✓ | ✓ | ✓ |
| Tenant Administrator | ✓ | ✓ | ✓ | ✓ (tenant) |
| Manager | Read | ✗ | ✗ | ✗ |
| Employee | ✗ | ✗ | ✗ | ✗ |

---

## User Management

| Role | Create | Read | Update | Delete |
|------|:------:|:----:|:------:|:------:|
| Platform Super Admin | ✓ | ✓ | ✓ | ✓ |
| Tenant Administrator | ✓ | ✓ | ✓ | ✓ |
| Manager | ✗ | ✓ | Limited | ✗ |
| Employee | ✗ | Self | Self | ✗ |

---

## Attendance

| Role | Check In | Check Out | Approve | Reports |
|------|:--------:|:---------:|:-------:|:------:|
| Tenant Administrator | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ |
| Employee | ✓ | ✓ | ✗ | Self |
| Field Staff | ✓ | ✓ | ✗ | Self |

---

## GPS & Visits

| Role | Track | View | Assign | Reports |
|------|:-----:|:----:|:------:|:------:|
| Tenant Administrator | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ |
| Field Staff | ✓ | Self | ✗ | Self |
| Employee | Optional | Self | ✗ | Self |

---

## Fault Management

| Role | Create | Assign | Resolve | Close |
|------|:------:|:------:|:-------:|:-----:|
| Tenant Administrator | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ |
| Customer Support | ✓ | ✓ | ✓ | ✗ |
| Field Staff | ✓ | ✗ | ✓ | ✗ |
| Client User | ✓ | ✗ | ✗ | ✗ |

---

## Lead Management

| Role | Create | Update | Assign | Convert |
|------|:------:|:------:|:------:|:-------:|
| Tenant Administrator | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ |
| Sales Executive | ✓ | ✓ | ✗ | Limited |
| Employee | ✗ | ✗ | ✗ | ✗ |

---

## Reports

| Role | View | Export | Schedule |
|------|:----:|:------:|:--------:|
| Platform Super Admin | ✓ | ✓ | ✓ |
| Tenant Administrator | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | Limited |
| Employee | Self | ✗ | ✗ |
| Client User | Limited | ✗ | ✗ |

---

## Settings

| Role | Tenant Settings | Branding | Feature Flags |
|------|:---------------:|:--------:|:-------------:|
| Platform Super Admin | ✓ | ✓ | ✓ |
| Tenant Administrator | ✓ | ✓ | ✓ (tenant) |
| Manager | ✗ | ✗ | ✗ |
| Employee | ✗ | ✗ | ✗ |

---

# 7. Permission Resolution Rules

- Multiple roles are supported.
- Effective permissions are the union of assigned roles.
- Explicit deny overrides all allows.
- Disabled modules automatically deny access.
- Tenant boundaries are always enforced.
- Platform roles cannot bypass tenant isolation except through approved platform governance.

---

# 8. Custom Tenant Permissions

Tenants may:

- Create custom roles.
- Combine existing permissions.
- Disable unused modules.
- Restrict administrative functions.

Tenants may not modify protected platform permissions.

---

# 9. Field-Level Security (Future)

Future enhancement:

- Read-only fields
- Hidden fields
- Sensitive data masking
- Conditional visibility
- Department-specific restrictions

---

# 10. API Authorization Matrix

Every API endpoint must declare:

- Required permission code
- Required module
- Required resource
- Required action

Authorization is enforced through NestJS guards before business logic executes.

---

# 11. Audit Requirements

Changes to the permission matrix require:

- Architecture review
- Product approval
- CHANGELOG update
- PROJECT_STATE update
- Security review

Administrative events are always audited.

---

# 12. Performance Targets

- Permission evaluation: <10 ms
- Matrix lookup: <20 ms
- Role expansion: <30 ms
- Authorization guard execution: <15 ms

---

# 13. Testing Strategy

Functional:
- Positive and negative authorization scenarios
- Multi-role evaluation
- Module enable/disable

Security:
- Privilege escalation
- Cross-tenant access
- Direct API invocation
- Feature flag bypass

Performance:
- High concurrency
- Large permission catalog
- Bulk authorization requests

---

# 14. Acceptance Criteria

- Standard role matrix documented.
- All core modules mapped.
- Explicit deny precedence enforced.
- Multi-role evaluation defined.
- Tenant isolation maintained.
- API authorization requirements documented.
- Security review completed.
- Automated authorization tests pass.

---

# 15. Dependencies

- RBAC.md
- Roles.md
- Permissions.md
- Authentication.md
- Multi-Tenant
- User Management
- Feature Flags
- Audit Logging

---

# 16. Related Documents

- BUSINESS_RULES.md
- TECH_STACK.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- FEATURE_BACKLOG.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative default Permission Matrix specification for the Enterprise Workforce Platform RBAC module.
