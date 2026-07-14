# Users.md

# Enterprise Workforce Platform
## Core Platform – User Management Module
### User Domain Specification

**Module:** Core Platform → User Management
**Document:** Users
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The User Management subsystem manages every person and system account that accesses the Enterprise Workforce Platform. It provides identity, profile management, lifecycle management, organizational mapping, security controls, and integration with Authentication, RBAC, Multi-Tenant, Attendance, GPS, Fault Management, Lead Management, Workflow, Reporting, and Notifications.

A User is the central identity around which all platform activities are recorded.

---

# 2. Objectives

The subsystem shall:

- Manage complete user lifecycle.
- Support employees, field staff, managers, clients, and administrators.
- Support multi-tenant isolation.
- Support multiple roles per user.
- Maintain organizational assignments.
- Support auditability and compliance.
- Integrate with authentication and authorization.

---

# 3. User Types

Supported user types:

- Platform Super Administrator
- Platform Support
- Tenant Administrator
- Manager
- Supervisor
- Employee
- Field Staff
- Sales Executive
- Customer Support
- Client User
- Contractor
- Service Account (non-human)

---

# 4. Organizational Model

Platform
→ Tenant
→ Company
→ Branch
→ Department
→ Team
→ Designation
→ User

Each user belongs to exactly one tenant and company. Branch, department, team and designation are configurable according to organization structure.

---

# 5. User Profile

Core fields:

- user_id (UUID)
- tenant_id
- employee_code
- username
- first_name
- middle_name
- last_name
- display_name
- primary_email
- alternate_email
- mobile_number
- alternate_mobile
- gender
- date_of_birth
- employment_type
- joining_date
- profile_photo_url
- status
- created_at
- updated_at

Organizational fields:

- company_id
- branch_id
- department_id
- team_id
- designation_id
- reporting_manager_id

Security fields:

- auth_provider
- last_login_at
- password_changed_at
- mfa_enabled
- account_locked
- failed_login_count

---

# 6. User Lifecycle

Draft
→ Invited
→ Active
→ Suspended
→ Locked
→ Archived
→ Deleted (logical)

Only Active users may authenticate.

---

# 7. Identity Rules

- Username unique within tenant.
- Email uniqueness configurable.
- Employee code immutable after activation.
- Mobile verification supported.
- Multiple authentication providers supported.

---

# 8. Authentication Integration

Integrated with:

- Username/password
- Email OTP
- Mobile OTP
- JWT
- Refresh Tokens
- Session Management
- Device Management
- Future SSO and MFA

---

# 9. RBAC Integration

A user may have:

- Multiple roles
- Multiple permission groups
- Data scope assignments
- Menu permissions
- Screen permissions
- Field permissions

Authorization is resolved through the RBAC engine.

---

# 10. Organizational Assignment

Every user may be linked to:

- Company
- Branch
- Department
- Team
- Designation
- Reporting Manager
- Cost Center (future)
- Project (future)

Historical changes are preserved.

---

# 11. Business Rules

- Every active user belongs to one tenant.
- Every employee has one primary designation.
- Every employee has one reporting manager (except top level).
- Archived users cannot authenticate.
- Deletion is logical only.
- User history is immutable.

---

# 12. Database Design

Suggested tables:

users
user_profiles
user_addresses
user_contacts
user_preferences
user_history

Indexes:

- tenant_id
- username
- employee_code
- primary_email
- mobile_number
- status

---

# 13. REST APIs

GET    /api/v1/users

GET    /api/v1/users/{id}

POST   /api/v1/users

PUT    /api/v1/users/{id}

PATCH  /api/v1/users/{id}/status

POST   /api/v1/users/{id}/roles

POST   /api/v1/users/{id}/manager

GET    /api/v1/users/{id}/sessions

GET    /api/v1/users/{id}/devices

---

# 14. Reporting

Standard reports:

- Employee Directory
- Active Users
- Inactive Users
- New Joiners
- Department-wise Users
- Branch-wise Users
- Designation Distribution
- Login Activity
- User Status Summary

---

# 15. Security

Mandatory controls:

- Tenant isolation
- RBAC authorization
- Password policy enforcement
- Session validation
- Device validation
- Audit logging
- Encryption of sensitive data
- Optimistic locking

---

# 16. Audit Events

- User Created
- User Updated
- User Activated
- User Suspended
- User Locked
- User Archived
- Role Assigned
- Manager Changed
- Password Reset
- Profile Updated

---

# 17. Error Codes

USER-001 User Not Found

USER-002 Duplicate Username

USER-003 Duplicate Employee Code

USER-004 Duplicate Email

USER-005 Account Locked

USER-006 Account Suspended

USER-007 Invalid Tenant

---

# 18. Performance Targets

User lookup: <20 ms

Directory search: <300 ms

Profile retrieval: <100 ms

Role resolution: <20 ms

---

# 19. Testing Strategy

Functional

- CRUD
- Activation
- Suspension
- Organizational assignment
- Profile updates

Security

- Cross-tenant access
- Unauthorized updates
- Authentication integration
- Privilege escalation

Performance

- 1M+ users
- Bulk imports
- Concurrent updates

---

# 20. Future Enhancements

- Employee self-service
- Skill profiles
- Certifications
- Emergency contacts
- Digital signatures
- Organization charts
- AI profile assistant

---

# 21. Acceptance Criteria

- User lifecycle operational.
- Authentication integrated.
- RBAC integrated.
- Organization mapping supported.
- Audit trail complete.
- Tenant isolation enforced.
- Automated tests passing.

---

# 22. Dependencies

- Authentication
- RBAC
- MultiTenant
- Tenant.md
- Company.md
- Branch.md
- Department.md
- Team.md
- Designation.md
- DataScope.md

---

# 23. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- BUSINESS_RULES.md
- PRD.md
- PROJECT_VISION.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md

This document is the authoritative User domain specification for the Enterprise Workforce Platform User Management module.
