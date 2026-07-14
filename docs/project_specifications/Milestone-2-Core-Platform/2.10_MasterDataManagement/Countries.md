# Countries.md

# Enterprise Workforce Platform

## Core Platform – Master Data Module

### Countries Master Data Specification

**Module:** Core Platform → Master Data  
**Document:** Countries  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design

---

# 1. Purpose

The Countries master dataset provides the authoritative source for country information used across the Enterprise Workforce Platform.

All modules must reference this master rather than maintaining independent country lists.

---

# 2. Objectives

- Provide standardized ISO country information.
- Support multi-tenant configuration.
- Support localization.
- Support regulatory compliance.
- Support future international expansion.
- Maintain audit history.

---

# 3. Business Usage

Referenced by:

- Tenant Registration
- Company Management
- Branch Management
- Employee Profiles
- Customer Profiles
- Vendor Profiles
- Address Management
- Payroll
- Tax Configuration
- Time Zones
- Currency
- Localization
- Notifications
- Reports

---

# 4. Data Standard

Recommended standards:

- ISO 3166-1 Alpha-2
- ISO 3166-1 Alpha-3
- ISO 3166-1 Numeric
- ISO 4217 Currency
- ITU Country Calling Codes

---

# 5. Country Attributes

Each record contains:

- country_id
- iso_alpha2
- iso_alpha3
- iso_numeric
- country_name
- official_name
- short_name
- currency_code
- currency_name
- phone_code
- continent
- region
- default_language
- default_timezone
- nationality
- driving_side
- flag_url
- active
- display_order
- effective_from
- effective_to
- version
- created_at
- updated_at

---

# 6. Localization

Support:

- Native names
- English names
- Multiple translations
- RTL languages
- Unicode

---

# 7. Validation Rules

- ISO codes unique.
- Country name unique.
- Currency must exist.
- Time zone must be valid.
- Soft delete only.
- Historical versions retained.

---

# 8. Lifecycle

Draft
→ Approved
→ Published
→ Deprecated
→ Archived

---

# 9. Security

- JWT authentication
- RBAC authorization
- Tenant-aware read access
- Platform-admin write access
- Audit logging

---

# 10. Suggested Database Design

Tables:

- countries
- country_localizations
- country_versions
- country_audit

Indexes:

- iso_alpha2
- iso_alpha3
- iso_numeric
- country_name
- active

---

# 11. REST APIs

GET /api/v1/master/countries

GET /api/v1/master/countries/{id}

POST /api/v1/master/countries

PUT /api/v1/master/countries/{id}

DELETE /api/v1/master/countries/{id}

GET /api/v1/master/countries/search

---

# 12. Reports

- Active Countries
- Inactive Countries
- Country Usage
- Localization Coverage
- Version History

---

# 13. Audit Events

- Country Created
- Country Updated
- Country Published
- Country Archived

---

# 14. Error Codes

COUNTRY-001 Country Not Found

COUNTRY-002 Duplicate ISO Code

COUNTRY-003 Invalid Currency

COUNTRY-004 Invalid Time Zone

COUNTRY-005 Unauthorized Update

---

# 15. Performance Targets

Lookup: <20 ms

Search: <100 ms

Bulk load: Background job

---

# 16. Testing Strategy

Functional

- CRUD
- Search
- Localization
- Versioning

Security

- RBAC
- Audit
- Tenant isolation

Performance

- Large lookup volume
- Cached reads

---

# 17. Future Enhancements

- Automatic ISO updates
- UN statistical regions
- Tax metadata
- Public holiday integration
- Geocoding metadata

---

# 18. Acceptance Criteria

- ISO-compliant dataset.
- Localization supported.
- Version history maintained.
- Audit trail complete.
- Automated tests passing.

---

# 19. Dependencies

- MasterData.md
- Localization.md
- General.md
- AuditLogs.md
- RBAC.md

---

# 20. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Countries master data specification for the Enterprise Workforce Platform.
