# Designation.md

# Enterprise Workforce Platform
## Core Platform – Multi-Tenant Module
### Designation Domain Specification

**Module:** Core Platform → Multi-Tenant  
**Document:** Designation  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design  
**Owner:** Platform Architecture Team

---

# 1. Purpose

A Designation represents the official job title or position assigned to an employee within a Company. It defines the employee's organizational identity and is used across HR, Attendance, Workflow, Reporting, RBAC, Data Scope, Approval Chains, Payroll integrations, and Analytics.

A Designation is **not** a Role.

- **Designation** = Job position (e.g., Network Engineer)
- **Role** = System permissions (e.g., Manager)
- **Department** = Functional unit
- **Team** = Operational execution unit

An employee may hold one Designation while simultaneously having multiple RBAC roles.

---

# 2. Objectives

The Designation subsystem shall:

- Standardize job titles.
- Support hierarchical positions.
- Support multiple grades and levels.
- Support department-specific designations.
- Integrate with approval workflows.
- Support reporting structures.
- Maintain historical designation changes.
- Support future HR and payroll integrations.

---

# 3. Organization Hierarchy

Platform
→ Tenant
→ Company
→ Branch (optional)
→ Department
→ Team
→ Designation
→ Employee

---

# 4. Designation Profile

Mandatory fields:

- designation_id (UUID)
- tenant_id
- company_id
- designation_code
- designation_name
- display_name
- designation_level
- job_family
- employment_category
- status
- created_at
- updated_at
- created_by
- updated_by

Optional:

- branch_id
- department_id
- parent_designation_id
- description
- grade
- metadata

Designation codes are immutable.

---

# 5. Designation Categories

Examples:

Executive Leadership
- CEO
- COO
- CTO
- CFO

Management
- General Manager
- Regional Manager
- Branch Manager
- Department Manager
- Team Lead

Technical
- Senior Software Engineer
- Network Engineer
- Fiber Engineer
- NOC Engineer
- QA Engineer

Field Operations
- Field Executive
- Installation Technician
- Service Engineer
- Maintenance Engineer

Sales
- Sales Executive
- Area Sales Manager
- Business Development Executive

Support
- Customer Support Executive
- Helpdesk Analyst

Administration
- HR Executive
- Accountant
- Office Administrator

---

# 6. Designation Levels

Suggested levels:

L1 - Executive
L2 - Associate
L3 - Senior Associate
L4 - Engineer
L5 - Senior Engineer
L6 - Lead
L7 - Manager
L8 - Senior Manager
L9 - General Manager
L10 - Director
L11 - Vice President
L12 - C-Level

Levels are configurable per tenant.

---

# 7. Lifecycle

Draft
→ Active
→ Suspended
→ Archived
→ Closed

Historical assignments are preserved.

---

# 8. Relationship with RBAC

Designation does NOT determine permissions.

Example:

Designation:
- Network Engineer

Possible Roles:
- Employee
- Field Staff
- Fault Technician

Another example:

Designation:
- Branch Manager

Possible Roles:
- Manager
- Approver
- Report Viewer

RBAC remains the authoritative authorization mechanism.

---

# 9. Employee Assignment

Each employee has:

- Primary Designation
- Effective Start Date
- Effective End Date
- Previous Designations

Future:

- Temporary Acting Designation
- Dual Designations
- Promotion History

---

# 10. Approval Authority

Designation can participate in:

- Attendance approval
- Leave approval
- Expense approval
- Fault escalation
- Lead approval
- Workflow routing

Approval rights are configured independently from RBAC.

---

# 11. Business Rules

- Every employee must have one active primary designation.
- Designation codes are unique within a tenant.
- Archived designations cannot be assigned.
- Historical designation records cannot be deleted.
- Promotions create new history entries.

---

# 12. Database Design

Suggested tables:

designations

employee_designations

designation_hierarchy

designation_history

Columns include:

- designation_id
- tenant_id
- company_id
- designation_code
- designation_name
- level
- status

Indexes:

- tenant_id
- company_id
- designation_code
- designation_level

---

# 13. REST APIs

GET    /api/v1/designations

GET    /api/v1/designations/{id}

POST   /api/v1/designations

PUT    /api/v1/designations/{id}

PATCH  /api/v1/designations/{id}/status

POST   /api/v1/employees/{id}/designation

GET    /api/v1/designations/hierarchy

---

# 14. Reporting

Reports include:

- Employees by designation
- Promotion trends
- Designation distribution
- Vacancy analysis
- Workforce composition
- Headcount by designation
- KPI by designation

---

# 15. Security

Mandatory:

- Tenant isolation
- Company validation
- RBAC authorization
- Audit logging
- Optimistic locking
- Historical preservation

---

# 16. Audit Events

- Designation Created
- Designation Updated
- Designation Activated
- Designation Archived
- Employee Assigned
- Employee Promoted
- Hierarchy Updated

---

# 17. Error Codes

DESG-001 Designation Not Found

DESG-002 Duplicate Designation Code

DESG-003 Invalid Company

DESG-004 Archived Designation

DESG-005 Invalid Level

DESG-006 Unauthorized Operation

---

# 18. Performance Targets

Lookup: <20 ms

Assignment: <100 ms

Hierarchy retrieval: <50 ms

Reporting: <300 ms

---

# 19. Testing Strategy

Functional

- CRUD
- Employee assignment
- Promotion history
- Hierarchy

Security

- Cross-tenant access
- Unauthorized updates
- Historical integrity

Performance

- Large designation catalogs
- Concurrent assignments

---

# 20. Future Enhancements

- Competency framework
- Skills mapping
- Career paths
- Certification requirements
- Salary bands
- AI career recommendations
- Succession planning

---

# 21. Acceptance Criteria

- Designation lifecycle implemented.
- Employee assignment operational.
- History maintained.
- Tenant isolation enforced.
- Reports available.
- Audit trail complete.
- Automated tests passing.

---

# 22. Dependencies

- MultiTenant.md
- Tenant.md
- Company.md
- Branch.md
- Department.md
- Team.md
- Authentication
- RBAC
- DataScope
- User Management

---

# 23. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- BUSINESS_RULES.md
- PRD.md
- PROJECT_VISION.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md

This document is the authoritative Designation domain specification for the Enterprise Workforce Platform Multi-Tenant module.
