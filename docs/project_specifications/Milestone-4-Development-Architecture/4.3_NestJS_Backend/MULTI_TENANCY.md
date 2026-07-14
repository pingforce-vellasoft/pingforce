# MULTI_TENANCY.md

> **Enterprise Multi-Tenant Workforce Management SaaS Platform**
>
> **Purpose:** This document defines the multi-tenancy architecture that shall be implemented within the NestJS backend. It specifies tenant isolation, configuration, branding, licensing, security, data ownership, and extensibility requirements for a reusable enterprise SaaS platform.

---

# 1. Objectives

The platform shall:

- Support multiple independent organizations from a single deployment.
- Isolate tenant data and configuration.
- Allow white-label customization.
- Enable tenant-specific business rules.
- Support configurable modules and licensing.
- Maintain high security and scalability.

---

# 2. Multi-Tenant Principles

The architecture shall provide:

- Single codebase
- Shared infrastructure
- Logical tenant isolation
- Tenant-aware APIs
- Tenant-aware authentication
- Tenant-specific configuration
- Independent branding
- Configurable workflows
- Configurable permissions

---

# 3. Tenant Hierarchy

```text
Platform
└── Tenant
    ├── Organization
    │   ├── Region
    │   │   ├── Zone
    │   │   │   ├── Branch
    │   │   │   │   ├── Department
    │   │   │   │   │   ├── Team
    │   │   │   │   │   │   └── Users
```

The hierarchy shall support simpler structures where some levels are not required.

---

# 4. Tenant Identity

Each tenant shall have:

- Tenant ID
- Tenant Code
- Client Login Code
- Organization Name
- Subscription Plan
- License Status
- Time Zone
- Default Language
- Currency
- Theme
- Branding Assets
- Contact Information

---

# 5. Tenant Resolution

The backend shall resolve the active tenant using one or more of:

- Client Code (mandatory except Super Admin)
- Subdomain
- Custom Domain
- JWT Claims
- API Key
- Service Token

Requests shall be rejected if tenant resolution fails.

---

# 6. Data Isolation

Every business record shall contain tenant ownership metadata.

Recommended ownership fields include:

- tenant_id
- organization_id
- region_id
- zone_id
- branch_id
- department_id
- team_id

Tenant filtering shall be automatically enforced throughout the platform.

---

# 7. Authentication

Authentication shall support:

- Super Admin
- Employer
- Manager
- Employee
- Customer (future)
- Vendor (future)
- API Clients

The authentication pipeline shall validate tenant identity before user authorization.

---

# 8. Authorization

Authorization shall combine:

- Tenant validation
- RBAC
- Permission Groups
- Data Scope
- Row-Level Security

Users shall never access resources belonging to another tenant.

---

# 9. White-Label Support

Each tenant shall be able to configure:

- Application Name
- Logo
- Splash Screen
- Icons
- Color Theme
- Fonts
- Email Templates
- Notification Templates
- Package Identifier (mobile)
- Firebase Configuration
- Custom Domain

---

# 10. Module Enablement

Each tenant shall independently enable or disable modules such as:

- Attendance
- GPS
- Leave
- Fault
- Lead
- Documents
- Assets
- Reports
- Dashboard
- Future Modules

Module availability shall be validated before executing business operations.

---

# 11. Feature Flags

Tenant-specific feature flags shall support capabilities including:

- GPS Mandatory
- Offline Attendance
- Biometric Verification
- Digital Signature
- WhatsApp Notifications
- Push Notifications
- API Access
- Bulk Import
- Advanced Reporting

---

# 12. Tenant Settings

Tenant configuration shall include:

- Working Hours
- Attendance Policies
- Leave Rules
- Workflow Rules
- Approval Chains
- Notification Preferences
- Security Policies
- Password Policies
- Session Timeout
- Device Restrictions

---

# 13. Workflow Customization

Each tenant shall define independent workflows for:

- Attendance
- Leave
- Faults
- Leads
- Documents
- Assets

Workflow stages shall be configurable without code changes.

---

# 14. Licensing

Licensing shall support:

- Trial Plans
- Subscription Plans
- Seat Limits
- Storage Limits
- API Limits
- Feature Restrictions
- Module Licensing
- Renewal Tracking

---

# 15. Security

The multi-tenant architecture shall enforce:

- Complete tenant isolation
- Secure JWT claims
- Encryption of sensitive information
- Audit logging
- Login history
- Device tracking
- Rate limiting
- Session management

---

# 16. Reporting

Reports shall always respect:

- Tenant boundaries
- User permissions
- Data scope
- Regional hierarchy

Cross-tenant reporting shall be restricted to Super Admin users.

---

# 17. Background Processing

Scheduled jobs and queues shall execute in a tenant-aware manner.

Examples:

- Notifications
- Report Generation
- Data Synchronization
- Cleanup
- License Validation

---

# 18. Database Considerations

All tenant-owned tables should include tenant ownership columns and appropriate indexes.

Reference tables may remain global when business requirements permit.

---

# 19. Future Expansion

The architecture shall accommodate:

- Multi-country deployments
- Regional data residency
- Multi-currency
- Multi-language
- Customer portals
- Vendor portals
- Partner ecosystems

without redesigning the core tenant model.

---

# 20. Governance

All new modules shall:

- Be tenant-aware
- Respect licensing
- Enforce data isolation
- Support branding
- Honor tenant configuration
- Integrate with RBAC and audit services

---

# Document Status

**Version:** 1.0

**Status:** Enterprise Multi-Tenancy Specification

**Purpose:** Defines the target multi-tenancy architecture to be implemented across the NestJS backend.
