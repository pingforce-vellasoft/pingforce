
# MASTER_DATA.md

# Fault Management Module – Master Data Specification

**Platform:** Enterprise Multi-Tenant Workforce Management SaaS Platform
**Module:** Fault Management
**Document:** Master Data Specification
**Version:** 1.0
**Status:** Enterprise Production Design

---

# 1. Purpose

The Master Data module centralizes all configurable reference data used by the Fault Management module. It eliminates hardcoded values and enables every tenant to configure business terminology, workflows, classifications, priorities, SLA mappings, notifications, and operational behavior without code changes.

The module integrates with:

- Module Engine
- Workflow Engine
- RBAC Engine
- Feature Flag Engine
- Assignment Engine
- SLA Engine
- Notification Engine
- Reporting Engine
- Analytics Engine
- Audit Framework

---

# 2. Objectives

- Standardize reference data
- Support tenant-specific configuration
- Enable white-label deployments
- Eliminate hardcoded lookup values
- Improve reporting consistency
- Simplify administration
- Support future modules through shared master data

---

# 3. Master Data Principles

- Multi-tenant
- Version controlled
- Soft delete
- Auditable
- Import/Export supported
- API manageable
- Role protected
- Localization ready
- Hierarchical where applicable

---

# 4. Master Data Categories

## 4.1 Fault Categories

Examples:
- Network
- Fiber
- Router
- ONU
- Hardware
- Software
- Electrical
- Customer Complaint
- Preventive Maintenance

Supports hierarchy:
Category → Subcategory

Fields:
- Name
- Code
- Description
- Parent
- Active
- Display Order
- SLA Mapping

---

## 4.2 Priorities

Examples:
- Critical
- High
- Medium
- Low

Attributes:
- Severity
- Color
- Response SLA
- Resolution SLA
- Escalation Level
- Sort Order

---

## 4.3 Statuses

Configurable workflow states:

- Draft
- New
- Assigned
- Accepted
- In Progress
- On Hold
- Waiting for Customer
- Waiting for Parts
- Vendor Support
- Testing
- Resolved
- Closed
- Cancelled
- Reopened

Each status supports:
- Initial flag
- Final flag
- Pause SLA
- Workflow mapping

---

## 4.4 Attempt Types

Examples:

- Initial Visit
- Follow-up
- Inspection
- Verification
- Vendor Visit
- Remote Support
- Preventive Maintenance

---

## 4.5 Attempt Outcomes

Examples:

- Resolved
- Partially Resolved
- Customer Unavailable
- Waiting Parts
- Escalated
- Revisit Required
- Duplicate
- Invalid Complaint

Outcome can trigger workflow transitions.

---

## 4.6 Escalation Levels

Examples:

- Level 1
- Level 2
- Level 3
- Regional
- Executive

Configurable hierarchy.

---

## 4.7 SLA Policies

Reference master:

- Response SLA
- Resolution SLA
- Business Hours
- Holiday Calendar
- Warning Thresholds
- Pause States

---

## 4.8 RCA Categories

- Human Error
- Process
- Equipment
- Software
- Hardware
- Vendor
- Training
- Documentation
- Environment
- Other

---

## 4.9 Feedback Templates

- CSAT
- NPS
- CES
- Custom Survey

Supports multilingual questionnaires.

---

## 4.10 Resolution Codes

Examples:

- Fixed
- Configuration Updated
- Hardware Replaced
- Software Patch
- Customer Education
- Duplicate
- No Fault Found

---

## 4.11 Reopen Reasons

- Issue Recurred
- Customer Dissatisfied
- Incorrect Resolution
- QA Failure
- Other

---

## 4.12 Hold Reasons

- Waiting Customer
- Waiting Vendor
- Waiting Parts
- Weather
- Safety
- Internal Approval

---

## 4.13 Notification Templates

Template references for:

- Ticket Created
- Assigned
- Reassigned
- Escalated
- Resolved
- Closed
- Feedback Request

---

## 4.14 Geographic Masters

- Country
- State
- Region
- Zone
- Branch
- Service Area
- Territory

---

## 4.15 Organization Masters

- Department
- Team
- Designation
- Skill
- Certification
- Technician Group

---

## 4.16 Vendor Masters

- Vendor
- Vendor Category
- Service Type
- Contact
- SLA Contract

---

## 4.17 Asset Masters (Optional)

- Router
- ONU
- OLT
- Fiber
- Vehicle
- Tool
- Equipment

---

# 5. Common Fields

Every master table contains:

- id (UUID)
- tenant_id
- code
- name
- description
- display_order
- is_active
- is_system
- created_at
- updated_at
- created_by
- updated_by

---

# 6. Business Rules

- Codes unique per tenant
- Soft delete only
- In-use masters cannot be deleted
- Deactivation allowed if not referenced
- Changes audited
- Localization supported

---

# 7. RBAC

Permissions:

- master.view
- master.create
- master.update
- master.delete
- master.import
- master.export

Row-level security applies.

---

# 8. Import / Export

Supported:

- Excel
- CSV
- JSON

Capabilities:

- Bulk import
- Validation report
- Duplicate detection
- Template download
- Rollback on failure

---

# 9. APIs

- GET /masters
- GET /masters/{type}
- POST /masters/{type}
- PUT /masters/{type}/{id}
- DELETE /masters/{type}/{id}
- POST /masters/import
- GET /masters/export

---

# 10. Database Tables

Suggested tables:

- master_fault_categories
- master_priorities
- master_statuses
- master_attempt_types
- master_attempt_outcomes
- master_resolution_codes
- master_hold_reasons
- master_reopen_reasons
- master_feedback_templates
- master_rca_categories
- master_notification_templates
- master_regions
- master_territories
- master_departments
- master_teams
- master_skills
- master_vendors

---

# 11. Reporting

Master reports:

- Active Masters
- Inactive Masters
- Usage Analysis
- Duplicate Codes
- Configuration Audit
- Import History

---

# 12. Audit & Versioning

Track:

- Create
- Update
- Deactivate
- Import
- Export
- Restore

Maintain complete version history.

---

# 13. Future Enhancements

- AI master recommendations
- Industry templates
- Cross-tenant template library
- Intelligent duplicate detection
- Semantic categorization
- Auto translation

---

# Conclusion

The Master Data framework provides a centralized, configurable foundation for the Fault Management module. It standardizes business reference data while supporting multi-tenancy, RBAC, workflow integration, analytics, reporting, localization, auditability, and white-label deployments across enterprise customers.
