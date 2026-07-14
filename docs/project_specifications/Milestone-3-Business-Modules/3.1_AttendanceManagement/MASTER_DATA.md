# MASTER_DATA.md

# Attendance Module - Master Data Specification

**Module:** Attendance  
**Component:** Master Data Management  
**Platform:** Enterprise Workforce Management SaaS Platform  
**Version:** 1.0  
**Status:** Production Ready

---

# 1. Purpose

The Master Data component centralizes all configurable reference data used by the Attendance module. It provides standardized values, eliminates duplication, enables tenant-specific customization, and supports consistent business rules across attendance, shift management, GPS validation, reporting, workflow, payroll, and audit modules.

---

# 2. Objectives

- Standardize attendance reference data
- Support multi-tenant configuration
- Enable no-code administration
- Ensure data consistency
- Improve reporting accuracy
- Support localization
- Maintain auditability

---

# 3. Master Data Hierarchy

Platform Master
→ Tenant Master
→ Company
→ Region
→ Branch
→ Department
→ Team
→ Employee Override (optional)

Higher-level defaults may be overridden where permitted.

---

# 4. Master Data Categories

## Organization

- Companies
- Regions
- Zones
- Branches
- Departments
- Teams
- Cost Centers
- Business Units

## Employee

- Designations
- Employment Types
- Employee Categories
- Grades
- Skill Levels

## Attendance

- Attendance Statuses
- Attendance Methods
- Attendance Reasons
- Attendance Exception Types
- Attendance Tags

Supported Statuses:

- Present
- Absent
- Late
- Half Day
- Early Exit
- Holiday
- Weekly Off
- On Leave
- Work From Home
- Training
- On Duty

## Shift

- Shift Types
- Shift Templates
- Shift Rotations
- Break Types
- Overtime Rules

## GPS

- Geofence Types
- GPS Providers
- GPS Accuracy Levels
- Location Sources
- Validation Results

## Leave Integration

- Leave Types
- Holiday Types
- Weekly Off Templates
- Comp-Off Types

## Workflow

- Approval Levels
- Workflow Statuses
- Escalation Levels
- SLA Categories

## Notifications

- Notification Types
- Templates
- Priorities
- Delivery Channels

## Reports

- Report Categories
- Export Formats
- Dashboard Groups
- KPI Definitions

---

# 5. Standard Master Tables

- master_attendance_status
- master_attendance_method
- master_attendance_reason
- master_shift_type
- master_break_type
- master_geofence_type
- master_location_source
- master_validation_result
- master_holiday_type
- master_leave_type
- master_workflow_status
- master_notification_type
- master_priority
- master_report_category
- master_export_format

---

# 6. Common Fields

Each master table should contain:

- id (UUID)
- tenant_id (nullable for platform masters)
- code
- name
- description
- display_order
- active
- system_defined
- parent_id (optional)
- effective_from
- effective_to
- created_at
- updated_at
- created_by
- updated_by

---

# 7. Business Rules

- System-defined masters cannot be deleted.
- Tenant masters override platform defaults where allowed.
- Duplicate codes are not permitted within the same tenant.
- Soft delete is preferred.
- All changes are audited.
- Inactive master records cannot be selected for new transactions.

---

# 8. Administration

Authorized users can:

- Create
- Update
- Activate
- Deactivate
- Archive
- Import
- Export
- Search
- Bulk Update

Subject to RBAC permissions.

---

# 9. Import & Export

Supported Formats

- Excel (.xlsx)
- CSV
- JSON

Validation

- Duplicate detection
- Mandatory fields
- Reference validation
- Transaction rollback on failure

---

# 10. RBAC

Employee

- View applicable masters

Manager

- View operational masters

HR

- Manage attendance-related masters

Employer

- Manage tenant masters

Super Admin

- Manage platform defaults
- Publish master templates

---

# 11. Audit Requirements

Every change captures:

- User
- Role
- Tenant
- Previous Value
- New Value
- Timestamp
- Device
- IP Address

Audit records are immutable.

---

# 12. Integrations

- Attendance Engine
- Shift Management
- GPS Validation
- Workflow Engine
- Notification Engine
- Reporting
- Analytics
- Payroll
- Audit Framework
- Core Platform

---

# 13. Performance

- Cached reference data
- Read-optimized queries
- Versioned master data
- Horizontal scalability
- High availability

---

# 14. Future Enhancements

- AI-assisted master recommendations
- Version comparison
- Configuration templates
- Master data approval workflow
- Localization packs
- Industry-specific master libraries

---

End of Master Data Specification
