# States.md

# Enterprise Workforce Platform
## Core Platform – Master Data Module
### States / Provinces Master Data Specification

**Module:** Core Platform → Master Data
**Document:** States
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The States master dataset provides the authoritative repository for first-level administrative divisions (States, Provinces, Regions, Emirates, Territories, Prefectures and equivalent administrative units) used throughout the Enterprise Workforce Platform.

Every module requiring geographic information shall reference this centralized dataset instead of maintaining duplicate lookup tables.

---

# 2. Objectives

The subsystem shall:

- Maintain standardized state/province information.
- Support all countries.
- Support tenant-aware localization.
- Maintain parent-child relationships with Countries.
- Support effective dating and versioning.
- Enable reporting and analytics.
- Maintain complete audit history.

---

# 3. Business Usage

Referenced by:

- Tenant Management
- Company Management
- Branch Management
- Employee Addresses
- Customer Addresses
- Vendor Management
- GPS & Geofencing
- Attendance
- Payroll
- Tax Configuration
- Logistics
- CRM
- Reports
- Analytics

---

# 4. Geographic Hierarchy

Country
→ State / Province
→ District / County
→ City
→ Postal Code

The parent country is mandatory.

---

# 5. Standards

Recommended standards:

- ISO 3166-2 subdivision codes
- Official government names
- Unicode support
- Country-specific administrative hierarchy

---

# 6. State Attributes

Each state record contains:

- state_id
- country_id
- iso_3166_2_code
- state_code
- state_name
- official_name
- short_name
- administrative_type
- capital_city
- timezone
- latitude
- longitude
- active
- display_order
- effective_from
- effective_to
- version
- created_at
- updated_at

---

# 7. Localization

Supports:

- Native language names
- English names
- Multiple translations
- Unicode
- RTL languages
- Local abbreviations

---

# 8. Validation Rules

- Parent country must exist.
- ISO subdivision code unique.
- State code unique within country.
- State name unique within country.
- Soft delete only.
- Historical versions retained.

---

# 9. Lifecycle

Draft
→ Review
→ Approved
→ Published
→ Deprecated
→ Archived

---

# 10. Security

- JWT authentication
- RBAC authorization
- Tenant-aware read access
- Platform administrator write access
- Audit logging
- Immutable version history

---

# 11. Suggested Database Design

Tables:

- states
- state_localizations
- state_versions
- state_audit

Indexes:

- country_id
- iso_3166_2_code
- state_code
- state_name
- active

---

# 12. REST APIs

GET    /api/v1/master/states

GET    /api/v1/master/states/{id}

GET    /api/v1/master/countries/{countryId}/states

POST   /api/v1/master/states

PUT    /api/v1/master/states/{id}

DELETE /api/v1/master/states/{id}

GET    /api/v1/master/states/search

---

# 13. Reports

- States by Country
- Active States
- Inactive States
- Localization Coverage
- Geographic Usage
- Version History

---

# 14. Audit Events

- State Created
- State Updated
- State Published
- State Archived
- Localization Updated

---

# 15. Error Codes

STATE-001 State Not Found

STATE-002 Country Not Found

STATE-003 Duplicate State Code

STATE-004 Duplicate ISO Code

STATE-005 Unauthorized Update

STATE-006 Invalid Parent Country

---

# 16. Performance Targets

Lookup: <20 ms

Search: <100 ms

Country state listing: <50 ms

Bulk synchronization: Background processing

---

# 17. Testing Strategy

Functional

- CRUD operations
- Country hierarchy
- Search
- Localization
- Versioning

Security

- RBAC validation
- Audit verification
- Tenant read isolation

Performance

- Large country datasets
- Cached lookups
- Concurrent access

---

# 18. Future Enhancements

- Administrative boundary polygons
- Census metadata
- Tax jurisdictions
- Election regions
- Automatic ISO synchronization
- GIS integration

---

# 19. Acceptance Criteria

- ISO-compliant subdivision data maintained.
- Parent-child hierarchy enforced.
- Localization supported.
- Version history maintained.
- Audit trail complete.
- Automated tests passing.

---

# 20. Dependencies

- MasterData.md
- Countries.md
- Localization.md
- AuditLogs.md
- RBAC.md

---

# 21. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative States master data specification for the Enterprise Workforce Platform.
