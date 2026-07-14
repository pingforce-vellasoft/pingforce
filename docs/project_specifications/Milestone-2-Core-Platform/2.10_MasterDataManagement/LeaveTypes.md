# LeaveTypes.md

# Enterprise Workforce Platform
## Core Platform – Master Data Module
### Leave Types Master Data Specification

**Module:** Core Platform → Master Data
**Document:** LeaveTypes
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Leave Types master dataset provides the centralized and authoritative repository for all leave categories used throughout the Enterprise Workforce Platform.

It standardizes leave definitions, eligibility rules, accrual policies, approval requirements, payroll impact, attendance integration, statutory compliance, reporting and analytics.

Every leave request within the platform shall reference a Leave Type from this master dataset.

---

# 2. Objectives

The subsystem shall:

- Centralize all leave categories.
- Support statutory and company leave policies.
- Support tenant-specific leave definitions.
- Support country-specific regulations.
- Integrate with Attendance, Payroll and Workflow.
- Support configurable approval policies.
- Maintain complete audit history.

---

# 3. Business Usage

Referenced by:

- Employee Management
- Attendance Management
- Shift Management
- Payroll
- Workflow
- Notifications
- Reports
- Dashboards
- Leave Calendar
- Mobile Application
- HR Administration

---

# 4. Leave Type Hierarchy

Platform Default

→ Country Policy

→ Tenant Policy

→ Company Override

→ Department Override (Optional)

→ Employee Assignment

---

# 5. Standard Leave Types

Statutory

- Casual Leave (CL)
- Sick Leave (SL)
- Earned Leave (EL)
- Privilege Leave (PL)
- Annual Leave
- Maternity Leave
- Paternity Leave
- Adoption Leave

Company

- Compensatory Off
- Work From Home
- Optional Holiday
- Bereavement Leave
- Marriage Leave
- Study Leave
- Sabbatical
- Loss of Pay (LOP)
- On Duty (OD)

Custom tenant-defined leave types are fully supported.

---

# 6. Leave Type Attributes

Each record contains:

- leave_type_id
- tenant_id
- leave_code
- leave_name
- description
- category
- color
- icon
- paid_leave
- statutory_leave
- requires_approval
- requires_attachment
- max_days_per_request
- annual_quota
- accrual_enabled
- carry_forward_allowed
- encashment_allowed
- gender_restriction
- employment_type
- active
- effective_from
- effective_to
- version
- created_at
- updated_at

---

# 7. Leave Policy Configuration

Configurable rules:

- Minimum service period
- Maximum consecutive days
- Minimum notice period
- Backdated request limit
- Future request limit
- Half-day support
- Hourly leave
- Sandwich leave
- Holiday inclusion
- Weekend inclusion

---

# 8. Approval Rules

Approval models:

- Auto Approval
- Single Level
- Multi-Level
- Sequential Approval
- Parallel Approval

Escalation supported.

---

# 9. Accrual Rules

Supported:

- Monthly accrual
- Quarterly accrual
- Annual allocation
- Probation restrictions
- Carry forward
- Expiration
- Encashment

---

# 10. Attendance Integration

Attendance system shall:

- Validate leave type.
- Prevent duplicate attendance.
- Mark attendance status.
- Support partial-day leave.
- Support shift integration.

---

# 11. Payroll Integration

Leave types define:

- Paid/Unpaid
- Salary deduction
- Encashment eligibility
- Leave balance
- Statutory reporting

---

# 12. Security

Mandatory:

- JWT authentication
- RBAC authorization
- Tenant isolation
- Audit logging
- Version history
- Soft delete

---

# 13. Suggested Database Design

Tables:

- leave_types
- leave_type_rules
- leave_type_accrual
- leave_type_approval
- leave_type_versions
- leave_type_audit

Indexes:

- tenant_id
- leave_code
- category
- active
- effective_from

---

# 14. REST APIs

GET    /api/v1/master/leave-types

GET    /api/v1/master/leave-types/{id}

POST   /api/v1/master/leave-types

PUT    /api/v1/master/leave-types/{id}

DELETE /api/v1/master/leave-types/{id}

GET    /api/v1/master/leave-types/search

POST   /api/v1/master/leave-types/import

---

# 15. Reports

- Leave Type Usage
- Leave Balances
- Paid vs Unpaid Leave
- Leave Policy Compliance
- Leave Distribution
- Version History

---

# 16. Audit Events

- Leave Type Created
- Leave Type Updated
- Leave Type Published
- Leave Policy Updated
- Leave Type Archived

---

# 17. Error Codes

LEAVE-001 Leave Type Not Found

LEAVE-002 Duplicate Leave Code

LEAVE-003 Invalid Policy

LEAVE-004 Invalid Accrual Rule

LEAVE-005 Unauthorized Update

LEAVE-006 Leave Type In Use

---

# 18. Performance Targets

Lookup: <20 ms

Policy evaluation: <50 ms

Search: <100 ms

Bulk import: Background processing

---

# 19. Testing Strategy

Functional

- CRUD
- Policy validation
- Approval rules
- Accrual
- Payroll integration
- Attendance integration

Security

- RBAC validation
- Tenant isolation
- Audit verification

Performance

- Large policy datasets
- Concurrent evaluations
- Bulk imports

---

# 20. Future Enhancements

- AI leave recommendation
- Leave forecasting
- Country-specific compliance packs
- Calendar synchronization
- Public holiday intelligence
- Workforce capacity planning

---

# 21. Acceptance Criteria

- Leave types centrally managed.
- Policy engine operational.
- Payroll integration supported.
- Attendance integration supported.
- Audit trail complete.
- Automated tests passing.

---

# 22. Dependencies

- MasterData.md
- Attendance.md
- Users.md
- Workflow.md
- Reports.md
- AuditLogs.md
- RBAC.md

---

# 23. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- PROJECT_VISION.md

This document is the authoritative Leave Types master data specification for the Enterprise Workforce Platform.
