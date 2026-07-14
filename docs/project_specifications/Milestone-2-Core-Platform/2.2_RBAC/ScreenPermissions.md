# ScreenPermissions.md

# Enterprise Workforce Platform
## Core Platform – RBAC Module
### Screen Permissions & UI Authorization Specification

**Module:** Core Platform → RBAC
**Document:** Screen Permissions
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

This document defines how access to application screens is authorized across the Enterprise Workforce Platform.

A screen represents a complete UI view (Angular route or Flutter page). Every screen must be protected by server-side authorization and client-side navigation guards.

Screen permissions work together with:

- Authentication
- JWT
- RBAC
- Menu Permissions
- Permission Matrix
- Multi-Tenant
- Feature Flags
- White Label

---

# 2. Objectives

The Screen Permission subsystem shall:

- Prevent unauthorized screen access.
- Hide inaccessible screens from navigation.
- Protect deep links.
- Support tenant feature enablement.
- Support responsive web and mobile clients.
- Maintain consistent authorization across all UI platforms.

---

# 3. Authorization Principles

1. Authentication is mandatory.
2. Screen visibility follows menu permissions.
3. Screen access requires explicit permission.
4. APIs perform independent authorization.
5. UI authorization never replaces backend authorization.
6. Default access is DENY.

---

# 4. Screen Hierarchy

Application
→ Module
→ Feature
→ Screen
→ Component
→ Action

Example:

Attendance
 ├── Dashboard
 ├── Check-In
 ├── History
 └── Reports

---

# 5. Screen Metadata

Each screen definition includes:

- screen_id
- screen_code
- module
- route
- title
- icon
- required_permission
- feature_flag
- mobile_supported
- web_supported
- tenant_scope
- status

Screen codes are immutable.

---

# 6. Screen Access Rules

A screen is accessible only when:

✓ User authenticated

✓ Tenant active

✓ Module enabled

✓ Feature enabled

✓ Required permission granted

✓ Screen active

✓ Route registered

Otherwise access is denied and redirected to an authorized page.

---

# 7. Route Protection

## Angular

Every protected route shall use:

- Authentication Guard
- Tenant Guard
- Permission Guard
- Feature Flag Guard (optional)

Lazy-loaded modules must also be guarded.

## Flutter

Navigation uses:

- Authentication middleware
- Permission interceptor
- Route validation
- Session validation

---

# 8. Default Screen Matrix

| Screen | Platform Admin | Tenant Admin | Manager | Employee | Field Staff | Client |
|--------|:--------------:|:------------:|:-------:|:--------:|:-----------:|:------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | ✓ | Read | ✗ | ✗ | ✗ |
| Role Management | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Attendance Dashboard | ✓ | ✓ | ✓ | Self | Self | ✗ |
| GPS Tracking | ✓ | ✓ | ✓ | Self | Self | ✗ |
| Fault Tickets | ✓ | ✓ | ✓ | Limited | ✓ | Self |
| Lead Pipeline | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reports | ✓ | ✓ | ✓ | Self | Self | Limited |
| Settings | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

---

# 9. Deep Link Protection

Users attempting direct URL access must still pass:

- Authentication
- Tenant validation
- Screen permission
- API authorization

Unauthorized access returns:

HTTP 403 (Web API)

Navigation redirect (Web/Mobile UI)

---

# 10. Feature Flag Integration

Decision flow:

Feature Disabled
→ Hide Screen
→ Reject Route

Feature Enabled
→ Evaluate Screen Permission

---

# 11. White Label Behavior

Tenant customization may change:

- Screen titles
- Icons
- Branding
- Landing pages

Tenant customization cannot bypass authorization.

---

# 12. Screen APIs

GET /api/v1/navigation/screens

GET /api/v1/navigation/screens/{screenCode}

POST /api/v1/rbac/check-screen

These endpoints support UI initialization and diagnostics only. Backend business APIs remain authoritative.

---

# 13. Security Controls

Mandatory:

- Route guards
- Permission guards
- Backend authorization
- CSRF protection (Web)
- Session validation
- Audit logging
- Tenant isolation

Never expose protected data through hidden UI elements.

---

# 14. Audit Events

- Screen Access Granted
- Screen Access Denied
- Route Guard Failure
- Feature Disabled Access Attempt
- Unauthorized Deep Link
- Screen Configuration Updated

---

# 15. Error Codes

SCREEN-001 Permission Denied

SCREEN-002 Route Not Registered

SCREEN-003 Screen Disabled

SCREEN-004 Feature Disabled

SCREEN-005 Tenant Disabled

SCREEN-006 Authentication Required

---

# 16. Performance Targets

Route authorization: <10 ms

Permission lookup: <20 ms

Initial screen authorization payload: <100 ms

---

# 17. Testing Strategy

Functional

- Authorized screen access
- Unauthorized screen access
- Feature flag scenarios
- Multi-role evaluation

Security

- Deep-link bypass
- Route guard bypass
- Hidden route access
- Cross-tenant navigation

Performance

- Large navigation trees
- High concurrent logins
- Guard execution latency

---

# 18. Acceptance Criteria

- Every screen mapped to permissions.
- Route guards implemented.
- Deep links protected.
- Backend authorization enforced.
- Feature flags respected.
- Tenant isolation maintained.
- Audit events recorded.
- Automated tests passing.

---

# 19. Dependencies

- RBAC.md
- Roles.md
- Permissions.md
- PermissionMatrix.md
- MenuPermissions.md
- Authentication.md
- Multi-Tenant
- Feature Flags

---

# 20. Related Documents

- BUSINESS_RULES.md
- PROJECT_VISION.md
- PRD.md
- TECH_STACK.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Screen Permission specification for the Enterprise Workforce Platform RBAC module.
