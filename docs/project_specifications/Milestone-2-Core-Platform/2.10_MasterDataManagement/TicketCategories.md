# TicketCategories.md

# Enterprise Workforce Platform

## Core Platform – Master Data Module

### Ticket Categories Master Data Specification

**Module:** Core Platform → Master Data  
**Document:** TicketCategories  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design  
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Ticket Categories master dataset provides the centralized classification system for all service requests, incidents, faults, complaints, maintenance activities and operational tickets managed by the Enterprise Workforce Platform.

It standardizes ticket routing, SLA assignment, workflow selection, reporting, analytics and automation across every tenant.

This master is primarily consumed by the Fault Ticket Management module discussed for the platform, but is also reusable by Help Desk, CRM, Internal IT Support, Asset Management and future Service Management modules.

---

# 2. Objectives

The subsystem shall:

- Centralize ticket classification.
- Support unlimited category hierarchies.
- Support tenant-specific categories.
- Support automatic SLA assignment.
- Support routing rules.
- Support approval workflows.
- Enable analytics and reporting.
- Maintain complete audit history.

---

# 3. Business Usage

Referenced by:

- Fault Ticket Management
- Help Desk
- CRM
- Asset Management
- Field Service
- Workflow Engine
- SLA Management
- Notifications
- Reports
- Dashboards
- Mobile Application

---

# 4. Category Hierarchy

Platform Default
→ Tenant Category
→ Parent Category
→ Child Category
→ Sub Category
→ Issue Type

Example:

Network
→ Fiber
→ OLT
→ Power Failure

---

# 5. Standard Categories

Infrastructure

- Fiber Cut
- OLT
- ONU
- Router
- Switch
- Wireless
- Power Failure
- UPS
- Generator

IT

- Hardware
- Software
- Printer
- Laptop
- Desktop
- Email
- Active Directory

HR

- Attendance
- Leave
- Payroll
- Employee Profile

Facilities

- Electrical
- Plumbing
- Housekeeping
- Security

Customer Service

- Complaint
- Installation
- Service Request
- Billing
- Feedback

Custom tenant categories are fully supported.

---

# 6. Category Attributes

Each record contains:

- category_id
- tenant_id
- parent_category_id
- category_code
- category_name
- description
- icon
- color
- display_order
- default_priority
- default_sla
- default_assignee_group
- workflow_id
- requires_approval
- attachment_required
- customer_visible
- active
- effective_from
- effective_to
- version
- created_at
- updated_at

---

# 7. Business Rules

Supports:

- Parent-child validation
- Unlimited hierarchy depth
- Default values
- Category inheritance
- Tenant overrides
- Mandatory fields
- Soft delete
- Effective dating

---

# 8. SLA Integration

Category determines:

- Response SLA
- Resolution SLA
- Escalation policy
- Working calendar
- Priority defaults
- Reminder rules

---

# 9. Workflow Integration

Each category may define:

- Workflow
- Approval chain
- Assignment rules
- Escalation matrix
- Closure checklist
- Feedback process

---

# 10. Automation

Automatic:

- Assignment
- Notifications
- SLA selection
- Escalation
- Ticket numbering
- Checklist generation

---

# 11. Security

Mandatory:

- JWT authentication
- RBAC authorization
- Tenant isolation
- Audit logging
- Immutable history
- Version control

---

# 12. Suggested Database Design

Tables:

- ticket_categories
- ticket_category_hierarchy
- ticket_category_sla
- ticket_category_workflow
- ticket_category_versions
- ticket_category_audit

Indexes:

- tenant_id
- parent_category_id
- category_code
- active
- display_order

---

# 13. REST APIs

GET /api/v1/master/ticket-categories

GET /api/v1/master/ticket-categories/{id}

POST /api/v1/master/ticket-categories

PUT /api/v1/master/ticket-categories/{id}

DELETE /api/v1/master/ticket-categories/{id}

GET /api/v1/master/ticket-categories/tree

POST /api/v1/master/ticket-categories/import

---

# 14. Reports

- Category Usage
- Tickets by Category
- SLA Performance by Category
- Escalation Summary
- Active Categories
- Version History

---

# 15. Audit Events

- Category Created
- Category Updated
- Category Published
- Category Archived
- Workflow Changed
- SLA Updated

---

# 16. Error Codes

TCAT-001 Category Not Found

TCAT-002 Duplicate Category Code

TCAT-003 Invalid Parent Category

TCAT-004 Category In Use

TCAT-005 Invalid SLA

TCAT-006 Unauthorized Update

---

# 17. Performance Targets

Lookup: <20 ms

Hierarchy retrieval: <50 ms

Tree generation: <100 ms

Bulk import: Background processing

---

# 18. Testing Strategy

Functional

- CRUD
- Hierarchy
- SLA mapping
- Workflow mapping
- Import/Export

Security

- RBAC
- Tenant isolation
- Audit verification

Performance

- Large category trees
- Concurrent lookups
- Cached hierarchy

---

# 19. Future Enhancements

- AI category suggestion
- Automatic classification
- Semantic search
- Industry templates
- Predictive routing
- Knowledge base integration

---

# 20. Acceptance Criteria

- Centralized category management operational.
- Hierarchy supported.
- SLA integration operational.
- Workflow integration operational.
- Audit trail complete.
- Automated tests passing.

---

# 21. Dependencies

- MasterData.md
- Workflow.md
- Notifications.md
- Reports.md
- AuditLogs.md
- RBAC.md
- FaultManagement.md (future)

---

# 22. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- PROJECT_VISION.md

This document is the authoritative Ticket Categories master data specification for the Enterprise Workforce Platform.
