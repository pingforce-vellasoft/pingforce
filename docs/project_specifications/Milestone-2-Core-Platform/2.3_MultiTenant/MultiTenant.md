# MultiTenant.md

# Enterprise Workforce Platform

## Core Platform – Multi-Tenant Architecture Specification

**Module:** Core Platform → Multi-Tenant
**Document:** MultiTenant
**Version:** 1.0.0
**Status:** Approved for Architecture & Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Multi-Tenant subsystem is the foundation of the Enterprise Workforce Platform. It enables a single deployment of the platform to securely serve multiple independent organizations (tenants) while maintaining complete logical isolation of data, configuration, branding, users, permissions, workflows, and business processes.

Every feature developed for the platform must be tenant-aware.

---

# 2. Business Objectives

The Multi-Tenant subsystem shall:

- Support unlimited tenants.
- Ensure complete logical data isolation.
- Support white-label deployments.
- Allow tenant-specific configuration.
- Enable independent feature enablement.
- Support tenant lifecycle management.
- Scale horizontally without tenant interference.
- Maintain centralized platform governance.

---

# 3. Tenant Definition

A Tenant represents an independent customer organization.

Examples:

- ISP Company
- Enterprise Organization
- Hospital
- Manufacturing Company
- Educational Institution
- Government Department
- Franchise Network

Each tenant has independent:

- Users
- Roles
- Permissions
- Departments
- Branding
- Settings
- Workflows
- Reports
- Notifications
- Data

---

# 4. Multi-Tenant Architecture

Architecture Model:

Platform
│
├── Tenant A
│ ├── Users
│ ├── Attendance
│ ├── GPS
│ ├── Fault Tickets
│ └── Reports
│
├── Tenant B
│ ├── Users
│ ├── Attendance
│ ├── Leads
│ ├── Settings
│ └── Reports
│
└── Platform Services
├── Authentication
├── RBAC
├── Notifications
├── Audit
└── Monitoring

Logical isolation is enforced through tenant identifiers and authorization.

---

# 5. Isolation Strategy

Approved strategy:

Shared Application

- Shared Database
- Shared Schema
- Tenant ID on every business table

Mandatory rule:

Every tenant-owned record contains:

- tenant_id
- created_at
- updated_at
- created_by
- updated_by

Cross-tenant access is prohibited except for governed platform operations.

---

# 6. Tenant Lifecycle

1. Tenant Created
2. Initial Configuration
3. Branding Applied
4. Modules Enabled
5. Users Imported
6. Organization Configured
7. Production Activated
8. Operational Monitoring
9. Subscription Renewal
10. Suspension (if required)
11. Archive
12. Deletion (policy controlled)

Physical deletion is discouraged.

---

# 7. Tenant Metadata

Core fields:

- tenant_id
- tenant_code
- legal_name
- display_name
- status
- subscription_plan
- timezone
- locale
- currency
- country
- primary_domain
- support_email
- logo_url
- created_at
- updated_at

Optional:

- GST/VAT identifiers
- Contact information
- Billing preferences
- Data retention policy

---

# 8. Tenant States

- Draft
- Provisioning
- Active
- Suspended
- Archived
- Deleted

Only Active tenants may authenticate users.

---

# 9. Tenant Configuration

Each tenant may configure:

- Branding
- Themes
- Logo
- Login page
- Notification templates
- Business rules
- Attendance policies
- GPS policies
- Working hours
- Leave policies
- Feature flags
- Workflow definitions

Configuration never affects other tenants.

---

# 10. White Label Support

Supported branding:

- Company Logo
- Favicon
- Color palette
- Typography
- Login background
- Email templates
- Mobile splash screen
- Domain mapping

Platform branding remains configurable by Super Administrators.

---

# 11. Feature Flags

Every module supports tenant-level enablement.

Examples:

Attendance → Enabled

GPS Tracking → Disabled

Lead Management → Enabled

Fault Management → Enabled

Reports → Enabled

Disabled modules:

- Hidden from UI
- APIs inaccessible
- Permissions ignored

---

# 12. Authentication Integration

Every authenticated user belongs to exactly one tenant context.

Login flow:

Authenticate
→ Resolve Tenant
→ Validate Tenant
→ Validate User
→ Load Tenant Configuration
→ Issue JWT with tenant_id

---

# 13. RBAC Integration

Roles are tenant scoped.

Permissions are tenant scoped.

Data scope is tenant scoped.

Menu permissions are tenant scoped.

Screen permissions are tenant scoped.

Field permissions are tenant scoped.

---

# 14. Database Standards

Every business table includes:

- tenant_id
- created_at
- updated_at
- created_by
- updated_by
- version (optimistic locking)

Indexes:

- tenant_id
- status
- created_at

Composite indexes recommended:

tenant_id + business_key

---

# 15. API Standards

Every protected API validates:

- Authentication
- Tenant status
- JWT tenant_id
- Resource tenant_id
- Permissions

Tenant identifiers supplied by clients are never trusted without validation.

---

# 16. Security Controls

Mandatory:

- Tenant isolation
- JWT tenant validation
- Query filtering
- Audit logging
- Feature flag enforcement
- Server-side authorization
- Input validation
- Secrets stored in OCI Vault

Reference:

OWASP ASVS

OWASP SaaS Security Guidance

---

# 17. Monitoring

Per-tenant monitoring:

- Active users
- API usage
- Storage
- Login failures
- Failed jobs
- Notification usage
- Module utilization
- SLA metrics

Platform dashboards aggregate metrics without exposing tenant data.

---

# 18. Audit Events

- Tenant Created
- Tenant Activated
- Tenant Updated
- Branding Updated
- Feature Flags Changed
- Subscription Changed
- Tenant Suspended
- Tenant Archived
- Cross-Tenant Access Attempt

---

# 19. Error Codes

TENANT-001 Tenant Not Found

TENANT-002 Tenant Suspended

TENANT-003 Tenant Archived

TENANT-004 Invalid Tenant Context

TENANT-005 Cross-Tenant Access Denied

TENANT-006 Subscription Expired

---

# 20. Performance Targets

Tenant resolution: <20 ms

Tenant configuration load: <100 ms

Tenant-aware query overhead: <10 ms

Provisioning: <5 minutes

---

# 21. Testing Strategy

Functional

- Tenant provisioning
- Tenant suspension
- Branding
- Feature enablement

Security

- Cross-tenant access
- JWT manipulation
- Query filtering
- IDOR

Performance

- Thousands of tenants
- Millions of records
- Concurrent tenant logins

---

# 22. Acceptance Criteria

- Tenant isolation enforced.
- Every business entity tenant-aware.
- Feature flags operational.
- White-label branding supported.
- Authentication tenant-aware.
- RBAC tenant-aware.
- Audit trail complete.
- Automated tests passing.

---

# 23. Dependencies

- Authentication
- JWT
- RBAC
- User Management
- White Label
- Settings
- Feature Flags
- Audit Logging

---

# 24. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- Authentication.md
- RBAC.md
- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- PROJECT_VISION.md
- PRD.md

This document is the authoritative Multi-Tenant architecture specification for the Enterprise Workforce Platform.
