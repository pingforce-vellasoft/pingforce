# BUSINESS_RULES.md

# Enterprise Workforce Platform

## Business Rules Specification

**Document Version:** 1.0.0  
**Status:** Approved  
**Owner:** Product & Solution Architecture Team

---

# 1. Purpose

This document defines the mandatory business rules governing the Enterprise Workforce Platform. These rules are independent of implementation technology and represent the business policies that must be enforced across the web application, mobile application, backend services, APIs, integrations, reports and AI-assisted workflows.

Business rules are mandatory. Any exception requires explicit approval and documentation through an Architecture Decision Record (ADR).

---

# 2. Business Rule Hierarchy

Business rules are classified into five categories:

1. Platform Rules
2. Tenant Rules
3. User & Security Rules
4. Operational Rules
5. Governance Rules

Higher-level rules always take precedence over lower-level rules.

---

# 3. Platform Rules

## BR-PLAT-001 Multi-Tenant Isolation

Every business transaction shall belong to exactly one tenant.

Requirements:

- Every business record contains `tenant_id`.
- Cross-tenant data access is prohibited.
- Reports are tenant-scoped.
- Caches are tenant-aware.
- Search results never return another tenant's data.

---

## BR-PLAT-002 White Label

Each tenant maintains independent:

- Logo
- Brand colors
- Theme
- Login page
- Email templates
- Notification templates
- Feature flags
- Domain (optional)

Changes affect only the owning tenant.

---

## BR-PLAT-003 Module Enablement

Modules can be enabled or disabled per tenant.

Disabled modules:

- cannot appear in navigation
- cannot expose APIs
- cannot generate notifications
- cannot participate in workflows

---

# 4. Authentication Rules

## BR-AUTH-001

Every user must authenticate before accessing protected resources.

Supported mechanisms:

- Username & Password
- JWT
- Refresh Token

Future:

- SSO
- MFA

---

## BR-AUTH-002 Session Management

- Access tokens expire.
- Refresh tokens are rotated.
- Logout invalidates active sessions.
- Suspended users cannot authenticate.

---

# 5. Authorization Rules

## BR-RBAC-001

Every request requires permission evaluation.

Permission =

Role

- Tenant
- Module
- Action

Actions:

Create

Read

Update

Delete

Approve

Assign

Export

Import

Configure

---

## BR-RBAC-002

Users may possess multiple roles.

Effective permissions are the union of assigned roles.

Explicit deny overrides allow.

---

# 6. User Management Rules

Every user:

- belongs to one primary tenant
- has one active status
- may belong to departments
- may report to another user
- must have an audit trail

Statuses:

Pending

Active

Suspended

Locked

Disabled

Deleted

---

# 7. Attendance Rules

Attendance is valid only when:

- GPS validation passes (if enabled)
- geofence validation passes (if configured)
- user is active
- shift is valid

Business validations:

- no duplicate check-in
- check-out after check-in
- overtime follows tenant policy
- manual correction requires approval

---

# 8. GPS Rules

GPS collection follows tenant configuration.

Possible policies:

Mandatory

Optional

Disabled

When mandatory:

- Location permission required.
- GPS disabled blocks attendance.
- Geofence violations are logged.

---

# 9. Fault Management Rules

Every fault:

- receives unique ticket number
- has SLA
- has priority
- has owner
- records lifecycle history

Lifecycle:

Created

Assigned

Accepted

In Progress

Resolved

Closed

Reopened

Failures require mandatory resolution notes.

---

# 10. Lead Management Rules

Lead stages:

New

Contacted

Qualified

Proposal

Negotiation

Won

Lost

Rules:

- Every stage transition is logged.
- Lost leads require a reason.
- Won leads may create customer records.

---

# 11. Notification Rules

Notifications are event-driven.

Supported channels:

- In-App
- Push
- Email
- SMS (future)

Delivery obeys:

- tenant configuration
- user preferences
- module enablement

---

# 12. Reporting Rules

Reports are always filtered by:

- tenant
- permission
- selected filters

Users cannot export data they cannot view.

---

# 13. Workflow Rules

Approvals:

Requester ≠ Approver

Workflow engine:

- configurable
- auditable
- restartable
- versioned

Every workflow transition records:

- actor
- timestamp
- action
- remarks

---

# 14. Audit Rules

The following actions are always audited:

- Login
- Logout
- User creation
- Role changes
- Permission changes
- Attendance edits
- Ticket updates
- Configuration changes
- White-label updates

Audit records are immutable.

---

# 15. Data Rules

Mandatory fields:

tenant_id

created_at

updated_at

created_by

updated_by

Soft delete is mandatory unless legal requirements prohibit it.

---

# 16. Security Rules

Never allow:

- Cross-tenant access
- SQL injection
- XSS
- Hardcoded credentials
- Anonymous administration

Every sensitive operation requires authorization.

---

# 17. AI Engineering Rules

AI-generated code:

- follows Coding Standards
- passes Definition of Done
- passes architecture review
- passes security review
- is approved by a human reviewer

AI cannot bypass governance.

---

# 18. Compliance Rules

Platform shall support:

- Auditability
- Data retention
- Privacy
- Least privilege
- Traceability

Tenant-specific compliance requirements may extend these rules.

---

# 19. Rule Precedence

Priority order:

1. Legal & Regulatory
2. Security
3. Tenant Configuration
4. Business Rules
5. User Preferences

---

# 20. Change Management

Every business rule change requires:

1. Product approval
2. Architecture review
3. Documentation update
4. CHANGELOG update
5. PROJECT_STATE update
6. Regression testing

---

# 21. Related Documents

- README.md
- PROJECT_VISION.md
- PROJECT_STATE.md
- TECH_STACK.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative source for business policy enforcement across the Enterprise Workforce Platform.
