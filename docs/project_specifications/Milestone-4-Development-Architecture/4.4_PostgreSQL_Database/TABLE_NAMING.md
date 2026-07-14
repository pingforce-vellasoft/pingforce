# TABLE_NAMING.md

> **Document Type:** Enterprise PostgreSQL Table Naming Standards\
> **Purpose:** Define the mandatory table naming conventions for the
> Enterprise Multi-Tenant Workforce Management SaaS Platform. These
> standards shall ensure consistency, readability, maintainability,
> scalability, and cross-team collaboration across all database schemas.

---

# 1. Objectives

The table naming standards shall:

- Establish a uniform naming convention across all schemas.
- Improve developer productivity and readability.
- Simplify SQL development and code reviews.
- Reduce ambiguity and naming conflicts.
- Support enterprise-scale growth.
- Align with ORM (Prisma) conventions.
- Facilitate reporting, auditing, and integrations.

---

# 2. General Naming Principles

All table names shall:

- Use lowercase characters only.
- Use snake_case formatting.
- Use plural nouns for entity tables.
- Be descriptive and business-oriented.
- Avoid abbreviations unless universally accepted.
- Avoid database vendor-specific keywords.
- Avoid special characters and spaces.
- Remain stable after initial release.

**Examples**

Good Avoid

---

users User
attendance_records AttendanceData
notification_templates nt_temp
workflow_steps wfstep

---

# 3. Schema Prefix Strategy

Table names shall **not** include schema names.

Correct:

auth.users

attendance.attendance_records

notification.notification_templates

Incorrect:

auth_users

attendance_attendance

---

# 4. Business Entity Tables

Business entities shall use plural descriptive names.

Examples:

- users
- employees
- customers
- organizations
- tenants
- attendance_records
- leave_requests
- fault_tickets
- leads
- documents
- assets

---

# 5. Relationship Tables

Many-to-many relationship tables shall combine participating entities.

Pattern:

entity_one_entity_two

Examples:

- user_roles
- role_permissions
- employee_teams
- tenant_modules
- module_features
- workflow_roles

---

# 6. Lookup Tables

Reference tables shall use meaningful plural names.

Examples:

- countries
- states
- cities
- departments
- designations
- priorities
- statuses
- leave_types
- lead_sources
- fault_categories

---

# 7. Configuration Tables

Configuration tables shall clearly identify their purpose.

Examples:

- tenant_settings
- branding_settings
- feature_flags
- notification_templates
- workflow_definitions
- approval_policies
- api_keys

---

# 8. Audit Tables

Audit-related tables shall clearly indicate historical purpose.

Examples:

- audit_logs
- login_history
- activity_logs
- data_change_logs
- workflow_history
- notification_logs
- synchronization_logs

---

# 9. Reporting Tables

Reporting structures shall distinguish transactional and reporting data.

Examples:

- attendance_summary
- monthly_productivity_reports
- tenant_usage_statistics
- dashboard_metrics
- kpi_snapshots

Materialized views shall follow the same descriptive approach.

---

# 10. Queue Tables

Background processing tables shall end with descriptive queue names.

Examples:

- notification_queue
- email_queue
- sms_queue
- sync_queue
- retry_queue
- export_queue

---

# 11. Integration Tables

External integration tables shall indicate ownership or purpose.

Examples:

- webhook_events
- api_requests
- api_tokens
- integration_logs
- external_sync_jobs

---

# 12. Temporary Tables

Application-level temporary tables shall be avoided whenever possible.

If required:

- temp_import_records
- temp_file_processing

Database session temporary tables shall use PostgreSQL temporary table
mechanisms rather than permanent objects.

---

# 13. Archive Tables

Archived business data shall use explicit suffixes.

Examples:

- attendance_records_archive
- audit_logs_archive
- notification_logs_archive

Archival strategy shall be documented separately.

---

# 14. Soft Delete Strategy

Soft deletion shall not create duplicate archive tables.

Business tables shall include:

- is_deleted
- deleted_at
- deleted_by

Archived tables shall only exist when business retention policies
require physical movement of historical data.

---

# 15. Reserved Words

Table names shall never conflict with SQL reserved keywords.

Avoid:

- user
- order
- group
- table
- column
- select
- index

Preferred alternatives:

- users
- purchase_orders
- user_groups

---

# 16. Versioning

Table names shall remain version-independent.

Avoid:

- users_v2
- attendance_new

Schema evolution shall be handled through migrations rather than renamed
tables.

---

# 17. Future-Proof Naming

Names shall remain generic enough to support future business expansion.

Prefer:

- assets

Instead of:

- isp_assets

Prefer:

- fault_tickets

Instead of:

- internet_faults

---

# 18. Module-Based Naming Examples

## Authentication

- users
- roles
- permissions
- user_roles
- sessions
- refresh_tokens

## Attendance

- attendance_records
- attendance_events
- attendance_requests
- attendance_adjustments

## GPS

- gps_locations
- geofences
- location_history
- travel_routes

## Lead Management

- leads
- lead_sources
- lead_activities
- lead_assignments

## Fault Management

- fault_tickets
- fault_assignments
- fault_comments
- fault_attachments

## Workflow

- workflow_definitions
- workflow_steps
- workflow_transitions
- workflow_instances

## Notification

- notification_templates
- notification_queue
- notification_logs
- notification_preferences

## Reporting

- dashboard_metrics
- report_definitions
- scheduled_reports
- report_exports

---

# 19. Review Checklist

Every new table shall be validated against the following:

- Uses lowercase only.
- Uses snake_case.
- Uses plural noun where applicable.
- Represents a single business concept.
- Avoids abbreviations.
- Avoids reserved keywords.
- Fits within the owning schema.
- Supports long-term maintainability.

---

# 20. Summary

These table naming standards define the mandatory conventions that shall
be applied across all PostgreSQL schemas within the Enterprise
Multi-Tenant Workforce Management SaaS Platform. Consistent naming shall
improve maintainability, readability, interoperability, and scalability
while providing a stable foundation for future modules, integrations,
and reporting capabilities.
