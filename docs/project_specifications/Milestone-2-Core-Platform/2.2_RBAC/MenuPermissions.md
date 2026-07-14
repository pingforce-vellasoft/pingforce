# MenuPermissions.md

# Enterprise Workforce Platform

## Core Platform – RBAC Module

### Menu Permissions & Navigation Authorization Specification

**Module:** Core Platform → RBAC
**Document:** Menu Permissions
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

This document defines how navigation menus, pages, navigation groups, dashboard widgets and user interface actions are authorized.

Menu authorization is a presentation-layer convenience only. It never replaces server-side authorization. Every backend API and business action must still be validated by the RBAC engine.

---

# 2. Objectives

The menu permission subsystem shall:

- Show only authorized menus.
- Hide disabled modules.
- Respect tenant feature flags.
- Support white-label navigation.
- Support responsive Angular and Flutter navigation.
- Keep navigation synchronized with RBAC.
- Avoid duplicate permission logic.

---

# 3. Principles

1. Authentication before menu loading.
2. RBAC determines visibility.
3. Feature flags determine availability.
4. Tenant configuration customizes navigation.
5. Backend authorization is always enforced.

---

# 4. Navigation Hierarchy

Application
→ Navigation Group
→ Menu
→ Sub Menu
→ Screen
→ Action

Example:

Administration
├── Users
├── Roles
├── Permissions
└── Settings

Operations
├── Attendance
├── GPS
├── Fault Tickets
└── Leads

---

# 5. Menu Metadata

Each menu stores:

- menu_id
- menu_code
- parent_menu
- display_name
- icon
- route
- display_order
- module
- required_permission
- feature_flag
- tenant_visibility
- mobile_visible
- web_visible
- status

Menu codes are immutable.

---

# 6. Visibility Rules

A menu is visible only when:

✓ User authenticated

✓ Tenant active

✓ Module enabled

✓ Feature enabled

✓ Required permission granted

✓ Menu active

Otherwise it is hidden.

---

# 7. Permission Resolution

Menu loading sequence:

1. Authenticate user
2. Resolve tenant
3. Load tenant branding
4. Load feature flags
5. Load roles
6. Resolve permissions
7. Build navigation tree
8. Return authorized menus

---

# 8. Standard Navigation

Platform

- Dashboard
- Administration
- Monitoring
- Audit
- Platform Settings

Tenant

- Dashboard
- Employees
- Attendance
- GPS
- Faults
- Leads
- Reports
- Notifications
- Settings

---

# 9. Default Menu Matrix

| Menu        | Platform Admin | Tenant Admin | Manager | Employee | Field Staff | Client  |
| ----------- | :------------: | :----------: | :-----: | :------: | :---------: | :-----: |
| Dashboard   |       ✓        |      ✓       |    ✓    |    ✓     |      ✓      |    ✓    |
| Users       |       ✓        |      ✓       |  Read   |    ✗     |      ✗      |    ✗    |
| Roles       |       ✓        |      ✓       |    ✗    |    ✗     |      ✗      |    ✗    |
| Permissions |       ✓        |      ✓       |    ✗    |    ✗     |      ✗      |    ✗    |
| Attendance  |       ✓        |      ✓       |    ✓    |    ✓     |      ✓      |  Self   |
| GPS         |       ✓        |      ✓       |    ✓    |   Self   |      ✓      |    ✗    |
| Faults      |       ✓        |      ✓       |    ✓    | Limited  |      ✓      |    ✓    |
| Leads       |       ✓        |      ✓       |    ✓    |    ✗     |      ✗      |    ✗    |
| Reports     |       ✓        |      ✓       |    ✓    |   Self   |    Self     | Limited |
| Settings    |       ✓        |      ✓       |    ✗    |    ✗     |      ✗      |    ✗    |

---

# 10. Screen Authorization

Opening a screen requires:

- Menu permission
- Screen permission
- API permission

If any validation fails, access is denied.

---

# 11. Action Permissions

Visibility of buttons depends on permissions.

Examples:

Create
Edit
Delete
Approve
Assign
Export
Configure

Buttons hidden in UI remain protected by backend authorization.

---

# 12. Feature Flag Integration

Menu visibility obeys:

Feature Disabled
→ Hide menu

Feature Enabled
→ Evaluate RBAC

---

# 13. White Label Support

Tenant administrators may configure:

- Menu labels
- Icons
- Ordering
- Landing page
- Dashboard widgets

Core permission rules cannot be bypassed.

---

# 14. APIs

GET /api/v1/navigation/menu

GET /api/v1/navigation/sidebar

GET /api/v1/navigation/mobile

GET /api/v1/navigation/dashboard

---

# 15. Security

Mandatory:

- Never expose hidden routes solely by URL.
- Protect lazy-loaded modules with guards.
- Validate permissions on every API.
- Do not trust client-side state.
- Audit navigation configuration changes.

---

# 16. Audit Events

- Menu Created
- Menu Updated
- Menu Hidden
- Menu Permission Changed
- Navigation Configuration Updated
- Unauthorized Screen Access

---

# 17. Performance Targets

Menu generation: <100 ms

Permission resolution: <20 ms

Navigation cache lookup: <10 ms

---

# 18. Testing

Functional

- Role-based menus
- Feature flags
- White-label navigation

Security

- Direct URL access
- Hidden menu bypass
- Unauthorized API calls

Performance

- Large menu trees
- Multiple concurrent users

---

# 19. Acceptance Criteria

- Authorized users see only permitted menus.
- Hidden modules remain inaccessible.
- Tenant branding supported.
- Navigation generated dynamically.
- API authorization matches menu permissions.
- Audit trail maintained.
- Automated tests pass.

---

# 20. Dependencies

- RBAC.md
- Roles.md
- Permissions.md
- PermissionMatrix.md
- Authentication.md
- Multi-Tenant
- Feature Flags
- White Label

---

# 21. Related Documents

- BUSINESS_RULES.md
- PROJECT_VISION.md
- PRD.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Menu Permission specification for the Enterprise Workforce Platform RBAC module.
