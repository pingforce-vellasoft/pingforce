# Company.md

# Enterprise Workforce Platform

## Core Platform – Multi-Tenant Module

### Company Domain Specification

**Module:** Core Platform → Multi-Tenant
**Document:** Company
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Company entity represents the legal or operational organization that owns a tenant within the Enterprise Workforce Platform.

While a Tenant is the technical boundary used by the platform, a Company represents the real-world business entity using the system.

In the initial architecture, one Tenant maps to one Company. The design remains extensible for future support of holding companies, subsidiaries, franchises, and multi-company organizations.

---

# 2. Objectives

The Company subsystem shall:

- Maintain legal company information.
- Store organization profile data.
- Support white-label branding.
- Support regional business settings.
- Integrate with tenant provisioning.
- Provide company metadata for reports and communications.
- Support future multi-company hierarchies.

---

# 3. Relationship Model

Platform
→ Tenant
→ Company
→ Business Units
→ Branches
→ Departments
→ Teams
→ Employees

The Company is the root business entity inside a tenant.

---

# 4. Company Profile

Core attributes:

- company_id (UUID)
- tenant_id
- company_code
- legal_name
- display_name
- registration_number
- tax_identifier (GST/VAT)
- company_type
- industry
- incorporation_date
- website
- support_email
- support_phone
- status
- created_at
- updated_at
- created_by
- updated_by

Optional:

- PAN/TIN equivalents
- Corporate logo
- Favicon
- Social media links
- Business description

---

# 5. Company Types

Supported examples:

- Private Limited
- Public Limited
- LLP
- Sole Proprietorship
- Partnership
- Government Department
- NGO
- Educational Institution
- Hospital
- Telecom/ISP
- Manufacturing
- Service Organization
- Franchise

---

# 6. Company Status

- Draft
- Active
- Suspended
- Archived
- Closed

Only Active companies may operate within an Active tenant.

---

# 7. Corporate Identity

The company profile controls:

- Company name
- Official logo
- Brand colors
- Letterheads
- Email footer
- Invoice header
- Report header/footer
- Mobile splash branding
- Login branding

Branding is tenant isolated.

---

# 8. Address Management

Support multiple addresses:

- Registered Office
- Corporate Office
- Billing Address
- Shipping Address
- Branch Address

Address fields:

- Line 1
- Line 2
- City
- State
- Postal Code
- Country
- Latitude
- Longitude

---

# 9. Contact Management

Company contacts:

- Primary Contact
- Technical Contact
- Billing Contact
- HR Contact
- Operations Contact
- Escalation Contact

Each contact stores:

- Name
- Designation
- Email
- Mobile
- Alternate Phone

---

# 10. Business Configuration

Company-level settings:

- Timezone
- Locale
- Currency
- Working Days
- Financial Year
- Week Start Day
- Date Format
- Time Format
- Number Format
- Language

Defaults cascade to subordinate organizational entities.

---

# 11. Organization Structure

Each company may define:

- Business Units
- Divisions
- Branches
- Departments
- Cost Centers
- Regions
- Zones
- Teams

These structures integrate with RBAC, Data Scope, Attendance, Workflow, Reporting and Fault Management.

---

# 12. Compliance

Supported metadata:

- GST/VAT
- Company Registration
- ISO Certifications
- Labor Licenses
- Industry Certifications
- Data Retention Policy
- Privacy Policy Version

Future:

- Compliance document repository
- License expiry tracking

---

# 13. Database Design

Suggested table: companies

Columns include:

- company_id
- tenant_id
- company_code
- legal_name
- display_name
- industry
- status
- timezone
- locale
- currency
- logo_url
- created_at
- updated_at

Indexes:

- tenant_id
- company_code
- status

---

# 14. APIs

GET /api/v1/company

GET /api/v1/company/profile

PUT /api/v1/company/profile

POST /api/v1/company/logo

GET /api/v1/company/contacts

PUT /api/v1/company/settings

---

# 15. Security

Mandatory:

- Tenant isolation
- Company ownership validation
- Server-side authorization
- Audit logging
- Optimistic locking
- Input validation
- Secure document storage

Only authorized tenant administrators may modify company information.

---

# 16. Audit Events

- Company Created
- Company Updated
- Branding Changed
- Address Updated
- Contact Updated
- Settings Updated
- Company Suspended
- Company Archived

---

# 17. Error Codes

COMPANY-001 Company Not Found

COMPANY-002 Duplicate Company Code

COMPANY-003 Company Suspended

COMPANY-004 Invalid Tenant

COMPANY-005 Branding Upload Failed

COMPANY-006 Validation Failed

---

# 18. Performance Targets

Company lookup: <20 ms

Profile load: <100 ms

Branding update: <500 ms

Settings retrieval: <50 ms

---

# 19. Testing Strategy

Functional

- Company CRUD
- Branding updates
- Address management
- Contact management
- Configuration inheritance

Security

- Cross-tenant access
- Unauthorized updates
- File upload validation

Performance

- Large branding assets
- Concurrent profile updates

---

# 20. Acceptance Criteria

- Company profile managed successfully.
- Branding isolated per tenant.
- Organization settings cascade correctly.
- Audit trail maintained.
- APIs secured.
- Automated tests passing.

---

# 21. Dependencies

- MultiTenant.md
- Tenant.md
- Authentication
- RBAC
- White Label
- Settings
- User Management
- Audit Logging

---

# 22. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- PROJECT_VISION.md
- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md

This document is the authoritative Company domain specification for the Enterprise Workforce Platform Multi-Tenant module.
