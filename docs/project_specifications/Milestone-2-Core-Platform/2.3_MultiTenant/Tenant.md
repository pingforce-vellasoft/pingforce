# Tenant.md

# Enterprise Workforce Platform
## Core Platform – Multi-Tenant Module
### Tenant Domain Specification

**Module:** Core Platform → Multi-Tenant
**Document:** Tenant
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

A Tenant represents an independent customer organization hosted within the Enterprise Workforce Platform. Every tenant owns its own users, configuration, branding, business data, workflows, permissions, reports, notifications and operational policies while sharing the same application deployment.

The Tenant domain is the primary business boundary for every platform operation.

---

# 2. Design Goals

The Tenant subsystem shall:

- Support unlimited organizations.
- Ensure complete logical isolation.
- Support white-label deployments.
- Support tenant-specific configuration.
- Support modular feature enablement.
- Enable lifecycle management.
- Support subscription plans.
- Provide centralized governance for platform administrators.

---

# 3. Tenant Model

Each tenant contains:

- Identity
- Subscription
- Branding
- Users
- Organization hierarchy
- Roles
- Permissions
- Business modules
- Settings
- Workflows
- Notifications
- Reports
- Audit history

No tenant shares operational data with another tenant.

---

# 4. Tenant Identity

Mandatory attributes:

- tenant_id (UUID)
- tenant_code (immutable)
- display_name
- legal_name
- status
- primary_domain
- timezone
- locale
- currency
- country
- support_email
- support_phone
- created_at
- updated_at
- created_by
- updated_by

Optional:

- GST/VAT registration
- Company registration number
- Website
- Address
- Billing contacts
- Logo
- Favicon

---

# 5. Tenant Lifecycle

States:

Draft
→ Provisioning
→ Active
→ Suspended
→ Archived
→ Deleted (logical)

Transitions:

- Create
- Activate
- Suspend
- Resume
- Archive
- Restore
- Delete (policy controlled)

Deletion is logical by default to preserve auditability.

---

# 6. Tenant Provisioning

Provisioning workflow:

1. Create tenant record
2. Generate tenant UUID
3. Reserve tenant code
4. Initialize default settings
5. Create default administrator
6. Create default roles
7. Enable subscribed modules
8. Configure branding
9. Initialize audit records
10. Activate tenant

Provisioning should be automated and idempotent.

---

# 7. Tenant Status Rules

Draft
- Not usable

Provisioning
- Internal setup only

Active
- Full platform access

Suspended
- Login disabled
- APIs disabled
- Background jobs paused (configurable)

Archived
- Read-only administrative access

Deleted
- Hidden from operations
- Retained according to retention policy

---

# 8. Subscription Model

Supported plans:

- Trial
- Starter
- Professional
- Enterprise
- Custom

Subscription controls:

- Enabled modules
- User limits
- Storage limits
- API quotas
- Branding options
- Support SLA

---

# 9. Tenant Branding

Branding includes:

- Company name
- Logo
- Favicon
- Primary/secondary colors
- Typography
- Login background
- Email templates
- Notification templates
- Mobile splash screen
- Domain mapping

Branding changes never affect other tenants.

---

# 10. Feature Enablement

Modules may be independently enabled:

- Authentication
- Attendance
- GPS
- Fault Management
- Lead Management
- Reports
- Workflow
- Notifications
- Inventory (future)
- CRM (future)

Disabled modules are hidden from UI and inaccessible via APIs.

---

# 11. Organization Structure

Each tenant defines:

- Business Units
- Departments
- Teams
- Reporting Hierarchy
- Regions
- Branches

These structures are used by RBAC, Data Scope and Workflow.

---

# 12. Security

Mandatory controls:

- JWT contains tenant_id
- Every business entity stores tenant_id
- Query filtering enforced
- Cross-tenant joins prohibited
- Server-side authorization only
- Secrets managed in OCI Vault

---

# 13. Database Standards

Every tenant-owned table contains:

- tenant_id
- created_at
- updated_at
- created_by
- updated_by
- version

Recommended indexes:

- tenant_id
- tenant_id + status
- tenant_id + business_key

---

# 14. APIs

Core endpoints:

GET    /api/v1/tenants

GET    /api/v1/tenants/{id}

POST   /api/v1/tenants

PUT    /api/v1/tenants/{id}

PATCH  /api/v1/tenants/{id}/status

POST   /api/v1/tenants/{id}/activate

POST   /api/v1/tenants/{id}/suspend

POST   /api/v1/tenants/{id}/archive

---

# 15. Monitoring

Per-tenant metrics:

- Active users
- Login success/failure
- API usage
- Storage consumption
- Module utilization
- Background jobs
- Notification volume
- SLA compliance

---

# 16. Audit Events

- Tenant Created
- Tenant Activated
- Tenant Updated
- Tenant Suspended
- Tenant Resumed
- Tenant Archived
- Branding Updated
- Subscription Changed
- Module Enabled
- Module Disabled

---

# 17. Error Codes

TENANT-001 Tenant Not Found

TENANT-002 Invalid Tenant

TENANT-003 Tenant Suspended

TENANT-004 Tenant Archived

TENANT-005 Subscription Expired

TENANT-006 Duplicate Tenant Code

TENANT-007 Cross-Tenant Operation Denied

---

# 18. Performance Targets

Tenant lookup: <20 ms

Provisioning: <5 minutes

Configuration load: <100 ms

Tenant context resolution: <20 ms

---

# 19. Testing Strategy

Functional:
- Tenant CRUD
- Provisioning
- Branding
- Module enablement
- Suspension/resume

Security:
- Cross-tenant isolation
- JWT manipulation
- Unauthorized administration
- Query filtering

Performance:
- 10,000+ tenants
- Concurrent onboarding
- High API throughput

---

# 20. Acceptance Criteria

- Tenant lifecycle implemented.
- Provisioning automated.
- Isolation enforced.
- Branding supported.
- Subscription model operational.
- Feature enablement works.
- Audit trail complete.
- Automated tests passing.

---

# 21. Dependencies

- MultiTenant.md
- Authentication
- RBAC
- User Management
- White Label
- Settings
- Feature Flags
- Audit Logging

---

# 22. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- Authentication.md
- RBAC.md
- BUSINESS_RULES.md
- TECH_STACK.md
- PRD.md
- PROJECT_VISION.md

This document is the authoritative Tenant domain specification for the Enterprise Workforce Platform Multi-Tenant module.
