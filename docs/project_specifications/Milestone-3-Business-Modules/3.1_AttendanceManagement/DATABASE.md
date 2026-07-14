# DATABASE.md

# Attendance Module Database Specification

**Module:** Attendance  
**Platform:** Enterprise Workforce Management SaaS Platform  
**Database:** PostgreSQL 17+  
**ORM:** Prisma ORM (Recommended)  
**Version:** 1.0  
**Status:** Production Ready Database Specification

---

# 1. Purpose

This document defines the logical database design for the Attendance module. It supports a multi-tenant architecture with configurable attendance policies, GPS validation, shift management, offline synchronization, correction workflows, audit logging, and enterprise reporting.

---

# 2. Design Principles

- Multi-tenant by design
- UUID primary keys
- Soft delete support
- Immutable audit history
- Optimized indexing
- Foreign-key integrity
- Horizontal scalability
- UTC timestamps with tenant timezone conversion
- Event-driven integration support

---

# 3. Core Tables

## attendance

Stores the finalized attendance record for a workday.

| Column             | Type        | Description              |
| ------------------ | ----------- | ------------------------ |
| id                 | UUID (PK)   | Attendance identifier    |
| tenant_id          | UUID        | Tenant                   |
| employee_id        | UUID        | Employee                 |
| attendance_date    | DATE        | Business date            |
| shift_id           | UUID        | Assigned shift           |
| status             | VARCHAR(30) | Present/Late/Absent/etc. |
| total_work_minutes | INTEGER     | Total work               |
| overtime_minutes   | INTEGER     | OT                       |
| created_at         | TIMESTAMP   | Created                  |
| updated_at         | TIMESTAMP   | Updated                  |

Indexes:

- (tenant_id, attendance_date)
- (employee_id, attendance_date)
- (status)

---

## attendance_sessions

One row per check-in/check-out session.

Fields include:

- id
- tenant_id
- attendance_id
- employee_id
- check_in_time
- check_out_time
- attendance_method
- device_id
- check_in_latitude
- check_in_longitude
- check_out_latitude
- check_out_longitude
- gps_accuracy
- session_status
- created_at

---

## attendance_breaks

Stores employee break sessions.

Columns

- id
- attendance_session_id
- break_type
- paid_break
- start_time
- end_time
- duration_minutes

---

## attendance_corrections

Correction workflow.

Fields

- id
- tenant_id
- attendance_id
- employee_id
- correction_type
- current_value
- requested_value
- reason
- workflow_status
- approved_by
- approved_at

---

## attendance_policy

Tenant-specific attendance rules.

Includes

- working_hours
- grace_period
- gps_required
- biometric_required
- geofence_required
- overtime_enabled
- correction_window_days
- auto_checkout
- multiple_breaks

---

## shifts

Stores reusable shift definitions.

Includes

- shift_code
- shift_name
- shift_type
- start_time
- end_time
- grace_period
- overtime_rule_id
- active

---

## shift_assignments

Employee-to-shift mapping.

Includes

- employee_id
- shift_id
- effective_from
- effective_to
- assignment_type

---

## geofences

Stores office/project/customer locations.

Supports

- Radius geofence
- Polygon geofence
- Multiple coordinates
- Active flag

---

## employee_locations

GPS history.

Fields

- latitude
- longitude
- accuracy
- captured_at
- speed
- provider
- battery_level

---

## gps_validation_logs

Stores every GPS validation decision.

Result values

- VALID
- LOW_ACCURACY
- OUTSIDE_GEOFENCE
- MOCK_LOCATION
- GPS_DISABLED

---

## offline_queue

Offline synchronization queue.

Stores

- payload
- retry_count
- sync_status
- last_attempt
- error_message

---

## sync_logs

Synchronization history.

Includes

- started_at
- completed_at
- records_processed
- result

---

## audit_logs

Immutable audit trail.

Columns

- actor_id
- tenant_id
- entity_name
- entity_id
- action
- old_value
- new_value
- ip_address
- device_id
- created_at

---

# 4. Relationships

tenant
├── attendance_policy
├── shifts
├── geofences
├── attendance
│ ├── attendance_sessions
│ ├── attendance_breaks
│ ├── attendance_corrections
│ └── gps_validation_logs
├── employee_locations
├── offline_queue
├── sync_logs
└── audit_logs

---

# 5. Constraints

- One active attendance session per employee.
- One attendance record per employee per business day.
- Shift assignments cannot overlap unless allowed.
- Attendance corrections require workflow approval.
- Tenant isolation enforced through foreign keys and application layer.

---

# 6. Recommended Indexes

attendance:

- tenant_id, attendance_date
- employee_id
- shift_id
- status

attendance_sessions:

- employee_id
- session_status
- check_in_time

employee_locations:

- employee_id, captured_at
- tenant_id

audit_logs:

- entity_name
- created_at
- tenant_id

---

# 7. Partitioning Strategy

Recommended partitions:

- attendance by month
- employee_locations by month
- audit_logs by month
- gps_validation_logs by month

---

# 8. Security

- UUID identifiers
- Row-level tenant isolation
- Encrypted sensitive columns where applicable
- Immutable audit data
- Soft delete for business entities
- JWT + RBAC enforced at service layer

---

# 9. Integrations

Database integrates with:

- Authentication
- RBAC
- User Module
- Workflow Engine
- Notification Engine
- Leave Management
- Payroll
- Reporting
- Analytics

---

# 10. Future Tables

- face_verification_logs
- wearable_sync
- beacon_validation
- ai_attendance_scores
- attendance_predictions
- payroll_adjustments

---

End of Database Specification
