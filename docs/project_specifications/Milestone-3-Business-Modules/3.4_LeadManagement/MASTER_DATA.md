# Lead Management Module

# MASTER_DATA.md

## Document Information

Item Value

---

Module Lead Management
Document Master Data Specification
Platform Enterprise Workforce Management SaaS
Version 1.0
Status Production Ready

---

# 1. Purpose

The Master Data module provides centralized, tenant-aware reference data
used throughout the Lead Management module. It ensures consistency,
governance, validation, reporting accuracy, workflow compatibility, and
configurable business rules across Web, Mobile, APIs, imports, and
integrations.

---

# 2. Objectives

- Standardize reference data
- Eliminate hardcoded values
- Support tenant-specific customization
- Improve reporting consistency
- Enable workflow-driven configuration
- Simplify integrations
- Maintain auditability and version history

---

# 3. Master Data Design Principles

- Multi-tenant by design
- RBAC controlled
- Soft delete support
- Version controlled
- Import/Export supported
- API accessible
- Audit logging enabled
- White-label compatible
- Localization ready
- Hierarchical where applicable

---

# 4. Core Master Data

## Lead Sources

Examples: - Website - Referral - Facebook - Instagram - Google Forms -
API - Webhook - Partner - Walk-in - Telecalling - Campaign

Fields: - Source Code - Source Name - Description - Active Flag -
Display Order

---

## Lead Statuses

Default: - New - Assigned - Contacted - Qualified - Proposal Sent -
Negotiation - Won - Lost - Archived

Tenant configurable.

---

## Pipeline Stages

Configuration: - Stage Name - Sequence - Color - Icon - SLA Hours -
Required Activities - Allowed Transitions - Automation Rules

---

## Priorities

- Low
- Medium
- High
- Critical

Configurable: - Color - Escalation Policy - SLA

---

## Lead Categories

Examples: - Residential - Commercial - Enterprise - Government -
Education - Healthcare

---

## Products & Services

Fields: - Product Code - Product Name - Category - Unit - Default
Price - Tax Category - Active Status

---

## Campaigns

Store: - Campaign Name - Medium - Budget - UTM Parameters - Start/End
Date - Owner

---

## Follow-up Types

- Phone Call
- WhatsApp
- Email
- Meeting
- Site Visit
- Demo
- Video Call
- SMS

---

## Follow-up Outcomes

- Interested
- Not Interested
- Callback
- Proposal Requested
- Proposal Sent
- Converted
- Lost
- No Response

---

## Quotation Templates

Maintain: - Template Name - Branding - Terms - Currency - Tax Rules -
Default Notes

---

## Discount Rules

- Fixed
- Percentage
- Approval Threshold
- Maximum Discount
- Margin Protection

---

## Customer Categories

Examples: - Prospect - Premium - Enterprise - Government - Channel
Partner - Distributor

---

## Duplicate Rules

- Matching Fields
- Match Threshold
- Auto Merge
- Manual Review
- Exception Users

---

## Notification Templates

Channels: - Email - Push - WhatsApp - SMS - In-App

Variables supported: - Customer Name - Lead Number - Executive Name -
Follow-up Date - Company Name

---

## Regions & Territories

Hierarchy: Country → State → Region → Zone → Branch → Territory

---

## Teams & Departments

- Sales
- Marketing
- Support
- Operations

Mappings: - Manager - Members - Branch - Region

---

## Reasons

Maintain separate masters for: - Lost Reasons - Rejection Reasons -
Escalation Reasons - Assignment Reasons - Archive Reasons

---

# 5. Database Tables

Recommended tables: - lead_sources - lead_statuses - pipeline_stages -
lead_priorities - lead_categories - products - campaigns -
followup_types - followup_outcomes - quotation_templates -
discount_rules - customer_categories - duplicate_rules -
notification_templates - regions - territories - departments - teams -
reason_master

---

# 6. Administration

Administrators can: - Create - Edit - Activate - Deactivate - Archive -
Import - Export - Clone - Reorder

---

# 7. RBAC

Permissions: - View Master Data - Create Master Data - Update Master
Data - Delete Master Data - Import - Export - Publish Changes

---

# 8. APIs

- GET /api/v1/master-data/{type}
- POST /api/v1/master-data/{type}
- PUT /api/v1/master-data/{type}/{id}
- DELETE /api/v1/master-data/{type}/{id}
- POST /api/v1/master-data/import
- GET /api/v1/master-data/export

---

# 9. Import / Export

Formats: - Excel - CSV - JSON

Supports: - Validation - Preview - Rollback - Error Report

---

# 10. Audit

Track: - Previous Value - New Value - User - Tenant - Timestamp -
Device - IP Address

---

# 11. Performance

- Lookup \<100 ms (cached)
- API \<2 seconds
- Cached reference data
- Horizontal scalability

---

# 12. Future Enhancements

- AI master data suggestions
- Automatic taxonomy generation
- Industry templates
- Marketplace master packs
- Version comparison
- Cross-tenant templates

---

# 13. Acceptance Criteria

- Tenant-specific masters supported
- RBAC enforced
- Audit logging enabled
- Import/export operational
- APIs documented
- Workflow integration complete
- White-label compatible
- Production ready
