
# DATABASE.md

> **Enterprise Multi-Tenant Workforce Management SaaS Platform**
>
> **Purpose:** This document defines the database architecture, modeling standards, data governance, scalability strategy, security controls, and operational guidelines that shall be implemented for the NestJS backend. It serves as the authoritative database design specification for all platform and business modules.

---

# 1. Objectives

The database architecture shall:

- Support a multi-tenant SaaS platform.
- Maintain strict tenant isolation.
- Provide high performance and scalability.
- Ensure ACID-compliant transactional processing.
- Support configurable business modules.
- Enable auditability and compliance.
- Support future horizontal scaling.

---

# 2. Technology Direction

| Component | Planned Technology |
|-----------|--------------------|
| Primary Database | PostgreSQL |
| ORM | Prisma ORM |
| Cache | Redis |
| Search (Future) | OpenSearch / Elasticsearch |
| Object Storage | OCI Object Storage / S3 Compatible |
| Migrations | Prisma Migrate |
| Backup | Automated Incremental & Full Backups |

---

# 3. Design Principles

The database design shall follow:

- Third Normal Form (3NF) by default
- Controlled denormalization only for performance
- Tenant-aware data ownership
- Soft deletion
- Auditability
- Referential integrity
- Optimistic concurrency where applicable
- UTC timestamps

---

# 4. Database Architecture

```text
Applications
      │
NestJS Backend
      │
Prisma ORM
      │
PostgreSQL
      │
──────────────────────────
│ Business Data
│ Configuration
│ Audit Logs
│ Workflow
│ Reporting
│ Licensing
──────────────────────────
```

---

# 5. Schema Organization

The solution shall organize data into logical domains including:

- Platform Core
- Authentication
- RBAC
- Multi-Tenancy
- Organization
- User Management
- Attendance
- GPS
- Leave
- Fault
- Lead
- Customer
- Asset
- Documents
- Notifications
- Reporting
- Analytics
- Audit
- Licensing
- Master Data

---

# 6. Multi-Tenant Strategy

Every tenant-owned table should include:

- tenant_id
- organization_id
- created_by
- updated_by
- created_at
- updated_at
- deleted_at (soft delete)

Tenant filtering shall be enforced by the application layer.

---

# 7. Core Platform Tables (Conceptual)

Platform entities should include:

- tenants
- organizations
- regions
- zones
- branches
- departments
- teams
- users
- roles
- permissions
- role_permissions
- user_roles
- modules
- tenant_modules
- features
- tenant_features
- workflows
- workflow_steps
- approval_flows
- notification_templates
- audit_logs
- settings
- branding
- subscriptions
- licenses

---

# 8. Business Domain Tables (Conceptual)

Attendance:
- attendance_records
- attendance_sessions
- attendance_adjustments

GPS:
- gps_locations
- visit_history
- geofences

Fault:
- faults
- fault_assignments
- fault_attempts
- fault_attachments

Lead:
- leads
- lead_sources
- lead_activities
- lead_followups

Documents:
- documents
- document_versions
- document_tags

Assets:
- assets
- asset_assignments
- asset_categories

Additional modules shall follow the same modeling conventions.

---

# 9. Relationship Guidelines

The schema shall prefer:

- Foreign keys
- Explicit join tables
- Stable surrogate primary keys (UUIDs)
- Indexed lookup fields

Cascade delete should be used cautiously; soft delete is preferred for business records.

---

# 10. Naming Standards

Tables:
- snake_case plural

Columns:
- snake_case

Primary Keys:
- id

Foreign Keys:
- <entity>_id

Timestamps:
- created_at
- updated_at
- deleted_at

---

# 11. Indexing Strategy

Indexes should be created for:

- Primary keys
- Foreign keys
- Tenant identifiers
- Frequently filtered columns
- Search columns
- Unique business identifiers

Composite indexes should be evaluated for high-volume queries.

---

# 12. Transactions

Transactional operations shall support:

- Atomic commits
- Rollbacks
- Optimistic concurrency
- Consistency across aggregates where required

Long-running business processes should be coordinated through workflows and events instead of database transactions.

---

# 13. Soft Delete Policy

Business entities should support soft deletion.

Deleted records shall:

- Remain auditable
- Preserve referential integrity
- Be excluded from default queries
- Support controlled restoration where appropriate

---

# 14. Audit Requirements

Audit information should capture:

- Entity
- Record ID
- Action
- Previous Values
- New Values
- User
- Tenant
- Device
- IP Address
- Timestamp

---

# 15. Security

The database architecture shall support:

- Encryption in transit
- Encryption at rest
- Least-privilege access
- Secret management
- Row-level authorization through application logic
- Sensitive data masking
- Password hashing
- Secure backups

---

# 16. Performance Strategy

The platform should support:

- Connection pooling
- Query optimization
- Batch operations
- Read caching
- Pagination
- Lazy loading where appropriate
- Materialized views (reporting)
- Partitioning for high-volume tables

---

# 17. Reporting & Analytics

Operational reporting shall remain isolated from transactional workloads where practical.

Future enhancements may include:

- Read replicas
- Data warehouse
- OLAP
- BI integrations

---

# 18. Backup & Recovery

The database platform shall support:

- Scheduled backups
- Point-in-time recovery
- Backup verification
- Disaster recovery testing
- Recovery documentation
- Retention policies

---

# 19. Scalability

The architecture shall accommodate:

- Read replicas
- Horizontal application scaling
- Database partitioning
- Archival strategies
- Future sharding if required
- Multi-region deployments

---

# 20. Governance

Every new module shall:

- Follow naming standards.
- Define foreign keys.
- Define indexes.
- Support tenant ownership.
- Support auditing.
- Support soft deletion.
- Provide migration scripts.
- Document schema changes.

---

# 21. Future Evolution

The design shall support future modules including:

- Payroll
- CRM
- Inventory
- Procurement
- Expenses
- Visitor Management
- Fleet Management
- AI Services

without requiring fundamental redesign.

---

# Document Status

**Version:** 1.0

**Status:** Enterprise Database Architecture Specification

**Purpose:** Defines the logical database architecture, governance, standards, and scalability model that shall be implemented for the NestJS backend.
