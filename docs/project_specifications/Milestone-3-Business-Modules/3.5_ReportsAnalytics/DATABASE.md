# DATABASE.md

# Reports & Analytics - Database Design Specification

## Document Information

Field Value

---

Module Reports & Analytics
Document Database Design
Platform Enterprise Multi-Tenant Workforce Management SaaS
Database PostgreSQL 16+
Cache Redis
Version 2.0
Status Production Ready

---

# 1. Purpose

This document defines the logical database architecture for the Reports
& Analytics module. The design supports high-volume analytical queries,
multi-tenant isolation, configurable reporting, scheduled reports,
dashboard widgets, KPI calculations, export history, report templates,
and auditability.

The reporting database consumes data from all business modules while
enforcing tenant isolation, row-level security (RLS), RBAC, feature
flags, and licensing.

---

# 2. Database Design Principles

- Multi-tenant architecture
- Normalized transactional metadata
- Optimized analytical tables
- Read-optimized reporting views
- Materialized summary tables
- Horizontal scalability
- Soft delete support
- UTC timestamp storage
- Auditability
- Extensible schema

---

# 3. Core Entities

## Report Definitions

Stores system and custom report definitions.

Suggested columns: - id (UUID) - tenant_id - module_code - report_code -
report_name - report_type - description - datasource -
query_definition - visualization_type - is_system - is_active -
version - created_by - updated_by - created_at - updated_at

---

## Dashboard Definitions

Stores dashboard layouts.

Columns: - id - tenant_id - dashboard_name - dashboard_type -
role_scope - layout_json - theme_config - is_default - created_by -
updated_by - timestamps

---

## Dashboard Widgets

Columns: - id - dashboard_id - widget_code - widget_type -
widget_title - datasource - position_x - position_y - width - height -
configuration_json - refresh_interval - is_visible

---

## KPI Definitions

Stores KPI metadata.

Columns: - id - tenant_id - module - kpi_code - kpi_name - formula -
aggregation_type - threshold_green - threshold_amber - threshold_red -
calculation_frequency - datasource - is_active

---

## KPI Snapshots

Stores calculated KPI values.

Columns: - id - tenant_id - kpi_id - snapshot_date - snapshot_period -
value - trend - calculated_at

---

## Report Templates

Stores reusable report templates.

Columns: - id - tenant_id - template_name - report_type - datasource -
filter_json - column_json - chart_json - is_public - owner_user_id

---

## Scheduled Reports

Columns: - id - tenant_id - report_id - schedule_name -
cron_expression - timezone - next_execution - last_execution -
retry_policy - delivery_channels - is_enabled

---

## Export History

Columns: - id - tenant_id - report_id - format - filename - file_size -
requested_by - generated_at - download_count - expiry_at - status

---

## Execution History

Tracks every report execution.

Columns: - id - tenant_id - report_id - execution_type -
execution_start - execution_end - duration_ms - status - error_message -
executed_by

---

## Report Sharing

Columns: - id - report_id - shared_with_role - shared_with_user -
permission - expires_at

---

## Dashboard Favorites

Stores personalized dashboards.

Columns: - id - tenant_id - user_id - dashboard_id - display_order

---

# 4. Reporting Views

Recommended materialized views:

- mv_attendance_summary
- mv_gps_summary
- mv_fault_summary
- mv_lead_summary
- mv_user_summary
- mv_security_summary
- mv_platform_kpis
- mv_branch_kpis
- mv_region_kpis
- mv_executive_dashboard

Refresh strategy: - Hourly - Nightly - On-demand

---

# 5. Relationships

- Tenant → Reports
- Tenant → Dashboards
- Dashboard → Widgets
- Report → Scheduled Reports
- Report → Export History
- KPI Definition → KPI Snapshots
- Report → Execution History
- User → Dashboard Favorites

---

# 6. Index Strategy

Indexes:

- tenant_id
- report_code
- module_code
- created_at
- snapshot_date
- status
- schedule_next_execution
- report_id
- dashboard_id

Composite examples:

- (tenant_id,module_code)
- (tenant_id,created_at)
- (tenant_id,status)
- (tenant_id,snapshot_date)

---

# 7. Partitioning

Recommended partitions:

- KPI snapshots by month
- Execution history by month
- Export history by month
- Audit history by month

---

# 8. Security

- Row-Level Security (RLS)
- Tenant isolation
- Encrypted sensitive metadata
- RBAC filtering
- Audit logging
- Soft deletes
- Immutable execution history

---

# 9. Performance

- Materialized views
- Redis caching
- Async aggregations
- Pagination
- Read replicas
- Background workers
- Query optimization

---

# 10. Data Retention

Suggested defaults:

- KPI snapshots: 5 years
- Execution history: 2 years
- Export history: 1 year
- Dashboard logs: 1 year
- Scheduled report history: 2 years

Tenant-configurable retention policies are supported.

---

# 11. Backup & Recovery

- Daily backups
- PITR (Point-in-Time Recovery)
- Cross-region backup
- Export metadata recovery
- Dashboard configuration backup

---

# 12. Future Enhancements

- Columnar analytical storage
- Data warehouse integration
- OLAP cubes
- Vector search for report discovery
- AI-generated datasets
- Lakehouse integration

---

## Technology Stack

Database: - PostgreSQL 16+ - Redis Cache

Backend: - NestJS Reporting Service - Prisma ORM

Infrastructure: - Background Job Engine - Object Storage - Analytics
Engine

---

## Status

**Database Design:** Approved

**Implementation Readiness:** Production Ready
