# LeadSources.md

# Enterprise Workforce Platform

## Core Platform – Master Data Module

### Lead Sources Master Data Specification

**Module:** Core Platform → Master Data
**Document:** LeadSources
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Lead Sources master dataset provides the centralized repository for all lead acquisition channels used by the CRM and Sales modules of the Enterprise Workforce Platform.

It standardizes lead origin tracking, attribution, marketing analytics, campaign effectiveness, ROI measurement, sales reporting and automation across all tenants.

Every lead created in the CRM shall reference a valid Lead Source from this master dataset.

---

# 2. Objectives

The subsystem shall:

- Centralize lead acquisition sources.
- Enable marketing attribution.
- Support tenant-specific lead sources.
- Integrate with CRM and Campaign Management.
- Improve reporting and analytics.
- Enable automation based on lead origin.
- Maintain complete audit history.

---

# 3. Business Usage

Referenced by:

- CRM
- Lead Management
- Opportunity Management
- Campaign Management
- Marketing Automation
- Sales Dashboard
- Customer Management
- Reports
- Analytics
- Notifications
- Mobile CRM

---

# 4. Lead Source Hierarchy

Platform Default
→ Tenant Source
→ Parent Source
→ Child Source
→ Campaign
→ Ad Group
→ Advertisement

Example:

Digital Marketing
→ Google Ads
→ Search Campaign
→ Brand Campaign

---

# 5. Standard Lead Sources

Digital

- Website
- Landing Page
- Google Search
- Google Ads
- Facebook
- Instagram
- LinkedIn
- YouTube
- WhatsApp
- Email Campaign
- SEO
- Organic Search

Offline

- Walk-In
- Phone Call
- Referral
- Existing Customer
- Partner
- Dealer
- Distributor
- Event
- Trade Show
- Exhibition
- Print Advertisement
- TV Advertisement
- Newspaper

Enterprise

- API Integration
- ERP Integration
- CRM Migration
- Bulk Import
- Manual Entry

Custom tenant-defined sources are fully supported.

---

# 6. Lead Source Attributes

Each record contains:

- lead_source_id
- tenant_id
- parent_source_id
- source_code
- source_name
- description
- category
- icon
- color
- display_order
- campaign_tracking_enabled
- utm_supported
- default_owner
- active
- effective_from
- effective_to
- version
- created_at
- updated_at

---

# 7. Marketing Integration

Supports:

- UTM Source
- UTM Medium
- UTM Campaign
- UTM Term
- UTM Content
- Campaign IDs
- Click IDs
- Referral URLs

---

# 8. Automation

Automatic:

- Lead Assignment
- Territory Routing
- Sales Team Assignment
- Notification Rules
- Follow-up Workflow
- Lead Scoring

---

# 9. Business Rules

- Unique source code.
- Parent-child hierarchy.
- Effective dating.
- Soft delete only.
- Version history retained.
- Tenant overrides supported.

---

# 10. Security

Mandatory:

- JWT authentication
- RBAC authorization
- Tenant isolation
- Audit logging
- Version control

---

# 11. Suggested Database Design

Tables:

- lead_sources
- lead_source_hierarchy
- lead_source_versions
- lead_source_campaigns
- lead_source_audit

Indexes:

- tenant_id
- source_code
- category
- active
- display_order

---

# 12. REST APIs

GET /api/v1/master/lead-sources

GET /api/v1/master/lead-sources/{id}

POST /api/v1/master/lead-sources

PUT /api/v1/master/lead-sources/{id}

DELETE /api/v1/master/lead-sources/{id}

GET /api/v1/master/lead-sources/tree

POST /api/v1/master/lead-sources/import

---

# 13. Reports

- Leads by Source
- Conversion Rate by Source
- Revenue by Source
- Campaign Performance
- Source Effectiveness
- Version History

---

# 14. Audit Events

- Lead Source Created
- Lead Source Updated
- Lead Source Published
- Lead Source Archived
- Campaign Mapping Updated

---

# 15. Error Codes

LSRC-001 Source Not Found

LSRC-002 Duplicate Source Code

LSRC-003 Invalid Parent Source

LSRC-004 Source In Use

LSRC-005 Invalid Campaign Mapping

LSRC-006 Unauthorized Update

---

# 16. Performance Targets

Lookup: <20 ms

Hierarchy retrieval: <50 ms

Search: <100 ms

Bulk import: Background processing

---

# 17. Testing Strategy

Functional

- CRUD
- Hierarchy
- Campaign mapping
- UTM mapping
- Import/Export

Security

- RBAC validation
- Tenant isolation
- Audit verification

Performance

- Large source catalogs
- Concurrent lookups
- Cached hierarchy

---

# 18. Future Enhancements

- AI lead source prediction
- Multi-touch attribution
- Customer journey mapping
- Marketing ROI engine
- Attribution dashboards
- Predictive lead scoring

---

# 19. Acceptance Criteria

- Centralized lead source management operational.
- CRM integration available.
- Marketing attribution supported.
- Tenant overrides operational.
- Audit trail complete.
- Automated tests passing.

---

# 20. Dependencies

- MasterData.md
- CRM.md (future)
- Reports.md
- Notifications.md
- AuditLogs.md
- RBAC.md

---

# 21. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- PROJECT_VISION.md

This document is the authoritative Lead Sources master data specification for the Enterprise Workforce Platform.
