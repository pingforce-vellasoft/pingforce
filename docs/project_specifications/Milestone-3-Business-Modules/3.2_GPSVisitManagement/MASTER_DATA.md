# MASTER_DATA.md

# GPS Visit Management - Master Data Specification

**Module:** GPS Visit Management
**Component:** Master Data Management
**Platform:** Enterprise Workforce Management SaaS Platform
**Version:** 1.0.0
**Status:** Production Ready

---

# 1. Purpose

The Master Data module centralizes all configurable reference data used by the GPS Visit Management module. It ensures consistency, tenant isolation, data quality, auditability, and reusability across planning, assignment, execution, reporting, and analytics.

---

# 2. Objectives

- Centralize reference data
- Eliminate duplicate configurations
- Improve data consistency
- Support tenant-specific customization
- Enable configurable business rules
- Maintain audit history
- Support localization

---

# 3. Configuration Hierarchy

- Global Platform
- Tenant
- Company
- Branch
- Department
- Team

---

# 4. Visit Masters

## Visit Types
- Planned
- Ad-hoc
- Emergency
- Inspection
- Installation
- Preventive Maintenance
- Complaint
- Sales
- Survey
- Audit
- Verification

## Visit Priorities
- Critical
- High
- Medium
- Low

## Visit Statuses
- Draft
- Planned
- Assigned
- Accepted
- Travelling
- Arrived
- Started
- In Progress
- Paused
- Completed
- Cancelled
- Rejected
- Closed

---

# 5. Route Masters

- Route Types
- Route Categories
- Territories
- Zones
- Regions
- Branches
- Route Templates
- Stop Types

---

# 6. GPS Masters

- GPS Providers
- Accuracy Levels
- Tracking Modes
- Tracking Intervals
- Location Providers
- GPS Status Codes

---

# 7. Geofence Masters

- Geofence Types
- Radius Profiles
- Polygon Templates
- Grace Distance Profiles
- Violation Types

---

# 8. Evidence Masters

- Document Types
- Photo Categories
- Video Categories
- Audio Categories
- Signature Types
- QR Types
- Barcode Types
- NFC Profiles

---

# 9. SLA Masters

- SLA Categories
- Response Time Profiles
- Completion Time Profiles
- Escalation Levels
- Delay Reasons

---

# 10. Notification Masters

Channels
- Push
- Email
- SMS
- WhatsApp
- In-App

Templates
- Assignment
- Reminder
- Completion
- GPS Alert
- Route Deviation
- SLA Breach
- Sync Failure

---

# 11. Productivity Masters

- KPI Definitions
- Score Ranges
- Performance Grades
- Productivity Targets

---

# 12. Report Masters

- Report Categories
- Export Formats
- Schedule Types
- Dashboard Widgets

---

# 13. Security Masters

- Roles
- Permissions
- Approval Levels
- Access Policies
- Device Policies

---

# 14. Integration Masters

- Maps Providers
- API Keys
- Webhooks
- External Systems
- Feature Flags

---

# 15. Common Attributes

Every master record contains:
- UUID
- Tenant ID
- Code
- Name
- Description
- Display Order
- Active Flag
- Effective From
- Effective To
- Created By
- Updated By
- Created At
- Updated At
- Version

---

# 16. APIs

GET    /master-data
GET    /master-data/{type}
POST   /master-data
PUT    /master-data/{id}
DELETE /master-data/{id}
GET    /master-data/search

---

# 17. Database Tables

- master_visit_types
- master_priorities
- master_statuses
- master_routes
- master_territories
- master_geofences
- master_gps_profiles
- master_sla_profiles
- master_notifications
- master_kpis
- master_reports
- master_roles
- master_integrations

---

# 18. Security

- JWT Authentication
- RBAC
- Tenant Isolation
- Audit Logging
- Version Control
- Soft Delete

---

# 19. Performance Targets

- Master Data Load <2 sec
- Search <1 sec
- Cached Reads
- High Availability
- Horizontal Scalability

---

# 20. Future Enhancements

- AI-assisted Configuration
- Dynamic Master Data Rules
- Metadata Versioning
- Configuration Marketplace
- Localization Packs

---

End of Master Data Specification
