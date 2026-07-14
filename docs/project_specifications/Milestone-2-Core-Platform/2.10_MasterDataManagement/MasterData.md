# MasterData.md

# Enterprise Workforce Platform
## Core Platform – Master Data Module
### Enterprise Master Data Management (MDM) Specification

**Module:** Core Platform → Master Data
**Document:** MasterData
**Version:** 1.0.0
**Status:** Approved for Detailed Design

---

# 1. Purpose

The Master Data module provides a centralized, tenant-aware repository for all reusable reference data used throughout the Enterprise Workforce Platform. It ensures consistency, governance, validation, versioning and controlled lifecycle management for configuration values consumed by every business module.

---

# 2. Objectives

The subsystem shall:

- Centralize reusable reference data.
- Eliminate duplicate lookup tables.
- Support tenant-specific overrides.
- Support platform defaults.
- Enable runtime configuration.
- Provide versioning and auditing.
- Support import/export.
- Integrate with RBAC and Data Scope.

---

# 3. Scope

Master Data is shared by:

- Authentication
- User Management
- RBAC
- Multi-Tenant
- Attendance
- GPS
- Leave
- Shift
- Workflow
- Fault Management
- CRM
- Notifications
- Reports
- White Label
- File Management
- Future AI modules

---

# 4. Master Data Hierarchy

Platform
→ Tenant
→ Company
→ Branch
→ Department
→ Module
→ Master Category
→ Master Item

Inheritance follows higher-to-lower override rules.

---

# 5. Core Categories

Organization

- Countries
- States
- Districts
- Cities
- Time Zones
- Languages
- Currencies

HR

- Departments
- Designations
- Employment Types
- Grades
- Skills
- Qualifications

Attendance

- Attendance Status
- Shift Types
- Break Types
- Leave Types
- Holiday Types

Workflow

- Priorities
- Statuses
- Approval Types
- Escalation Levels

CRM

- Lead Sources
- Industries
- Customer Types

Fault Management

- Fault Categories
- Severity
- Resolution Codes
- SLA Levels

Common

- Gender
- Blood Group
- Marital Status
- Document Types
- Notification Categories
- File Types

---

# 6. Master Item Structure

Each record contains:

- master_id
- tenant_id
- category
- code
- display_name
- description
- parent_id
- display_order
- color
- icon
- active
- effective_from
- effective_to
- version
- created_at
- updated_at

---

# 7. Lifecycle

Draft
→ Review
→ Approved
→ Published
→ Deprecated
→ Archived

---

# 8. Versioning

Supports:

- Major versions
- Minor versions
- Effective dating
- Rollback
- Change history

---

# 9. Validation Rules

- Unique code
- Mandatory display name
- Parent validation
- Duplicate prevention
- Effective date validation
- Tenant isolation

---

# 10. Security

- JWT authentication
- RBAC authorization
- Data Scope filtering
- Audit logging
- Tenant isolation
- Soft delete
- Immutable history

---

# 11. Import / Export

Supported:

- CSV
- Excel
- JSON

Import supports validation, preview and rollback.

---

# 12. Suggested Database

Tables:

- master_categories
- master_items
- master_versions
- master_import_jobs
- master_exports
- master_audit

Indexes:

- tenant_id
- category
- code
- active
- display_order

---

# 13. REST APIs

GET    /api/v1/master/categories

GET    /api/v1/master/items

POST   /api/v1/master/items

PUT    /api/v1/master/items/{id}

DELETE /api/v1/master/items/{id}

POST   /api/v1/master/import

GET    /api/v1/master/export

---

# 14. Reports

- Active Master Data
- Inactive Items
- Duplicate Codes
- Version History
- Import Summary
- Usage Statistics

---

# 15. Audit Events

- Category Created
- Item Created
- Item Updated
- Item Published
- Import Executed
- Export Generated

---

# 16. Error Codes

MDM-001 Category Not Found

MDM-002 Duplicate Code

MDM-003 Invalid Parent

MDM-004 Version Conflict

MDM-005 Import Failed

MDM-006 Unauthorized Update

---

# 17. Performance Targets

Lookup: <20 ms

Bulk import: Background

Search: <200 ms

Publish: <2 sec

---

# 18. Testing Strategy

Functional

- CRUD
- Import
- Export
- Versioning
- Hierarchy

Security

- Tenant isolation
- Unauthorized updates
- Audit verification

Performance

- Large catalogs
- Concurrent lookups
- Bulk imports

---

# 19. Future Enhancements

- AI-assisted classification
- Automatic translations
- Graph relationships
- Semantic search
- Master data synchronization
- Event-driven cache invalidation

---

# 20. Acceptance Criteria

- Centralized master data available.
- Versioning operational.
- Runtime updates supported.
- Tenant overrides functional.
- Audit trail complete.
- Automated tests passing.

---

# 21. Dependencies

- MultiTenant.md
- RBAC.md
- Authentication.md
- AuditLogs.md
- Reports.md
- General.md

---

# 22. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Master Data Management specification for the Enterprise Workforce Platform.
