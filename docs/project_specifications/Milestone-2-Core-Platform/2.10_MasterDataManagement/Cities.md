# Cities.md

# Enterprise Workforce Platform

## Core Platform – Master Data Module

### Cities / Municipalities Master Data Specification

**Module:** Core Platform → Master Data
**Document:** Cities
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

The Cities master dataset is the authoritative repository for all cities, municipalities, towns, villages and urban administrative units used throughout the Enterprise Workforce Platform.

Every module shall reference this centralized master to ensure consistent geographic data, reporting accuracy and tenant-wide standardization.

---

# 2. Objectives

The subsystem shall:

- Maintain standardized city information.
- Support global geographic hierarchies.
- Integrate with Countries and States masters.
- Support localization.
- Enable GIS and geofencing.
- Support versioning and auditing.
- Provide high-performance lookups.

---

# 3. Business Usage

Referenced by:

- Tenant Registration
- Company Management
- Branch Management
- Employee Addresses
- Customer Addresses
- Vendor Management
- Attendance
- GPS & Geofencing
- Route Planning
- CRM
- Reports
- Analytics
- Notifications
- Logistics

---

# 4. Geographic Hierarchy

Country
→ State / Province
→ District / County (optional)
→ City
→ Postal Code
→ Locality / Area

---

# 5. Standards

Recommended standards:

- ISO 3166-1 (Country)
- ISO 3166-2 (State)
- Unicode names
- WGS84 Coordinates
- Government administrative naming

---

# 6. City Attributes

Each record contains:

- city_id
- country_id
- state_id
- district_id (optional)
- city_code
- city_name
- official_name
- local_name
- administrative_type
- latitude
- longitude
- elevation
- timezone
- population
- area_sq_km
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
- Local aliases

---

# 8. Validation Rules

- Parent country required.
- Parent state required.
- Duplicate city names prevented within the same state where applicable.
- Coordinates validated.
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
- Platform-admin write access
- Audit logging
- Immutable version history

---

# 11. Suggested Database Design

Tables:

- cities
- city_localizations
- city_versions
- city_audit

Indexes:

- country_id
- state_id
- city_code
- city_name
- latitude
- longitude
- active

---

# 12. REST APIs

GET /api/v1/master/cities

GET /api/v1/master/cities/{id}

GET /api/v1/master/states/{stateId}/cities

POST /api/v1/master/cities

PUT /api/v1/master/cities/{id}

DELETE /api/v1/master/cities/{id}

GET /api/v1/master/cities/search

---

# 13. Reports

- Cities by State
- Cities by Country
- Active Cities
- Geographic Coverage
- Localization Coverage
- Version History

---

# 14. Audit Events

- City Created
- City Updated
- City Published
- City Archived
- Localization Updated

---

# 15. Error Codes

CITY-001 City Not Found

CITY-002 State Not Found

CITY-003 Country Not Found

CITY-004 Duplicate City Code

CITY-005 Invalid Coordinates

CITY-006 Unauthorized Update

---

# 16. Performance Targets

Lookup: <20 ms

Search: <100 ms

State city listing: <50 ms

Bulk synchronization: Background processing

---

# 17. Testing Strategy

Functional

- CRUD
- Search
- Hierarchy validation
- Localization
- Versioning

Security

- RBAC validation
- Audit verification
- Tenant read isolation

Performance

- Large datasets
- Cached lookups
- Concurrent access

---

# 18. Future Enhancements

- GIS boundary polygons
- Smart geocoding
- Reverse geocoding
- Public holiday mapping
- Census integration
- AI-assisted location matching

---

# 19. Acceptance Criteria

- Geographic hierarchy enforced.
- Localization supported.
- Version history maintained.
- Audit trail complete.
- Automated tests passing.

---

# 20. Dependencies

- MasterData.md
- Countries.md
- States.md
- AuditLogs.md
- RBAC.md
- Localization.md

---

# 21. Related Documents

- PRD.md
- BUSINESS_RULES.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Cities master data specification for the Enterprise Workforce Platform.
