
# DATABASE.md

# Fault Management Module – Database Design Specification

**Platform:** Enterprise Multi-Tenant Workforce Management SaaS Platform
**Module:** Fault Management
**Document:** Database Specification
**Version:** 1.0
**Database:** PostgreSQL

---

# 1. Purpose

This document defines the logical database design for the Fault Management module. The schema supports a configurable, multi-tenant, RBAC-enabled, workflow-driven fault management system with auditability, offline synchronization, analytics, and enterprise scalability.

---

# 2. Design Principles

- Multi-tenant isolation
- UUID primary keys
- Soft delete support
- UTC timestamps
- Audit-ready design
- API-first architecture
- Offline synchronization support
- Row-level security compatibility
- Optimized indexing
- Extensible metadata fields

---

# 3. Core Tables

## faults

Stores the master fault record.

Primary Columns

- id (UUID PK)
- tenant_id
- fault_number
- customer_id
- site_id
- category_id
- sub_category_id
- priority_id
- status_id
- workflow_instance_id
- current_assignee_id
- title
- description
- reported_by
- source
- latitude
- longitude
- address
- response_due_at
- resolution_due_at
- resolved_at
- closed_at
- created_at
- updated_at
- deleted_at
- created_by
- updated_by

Indexes

- tenant_id
- fault_number (unique per tenant)
- status_id
- priority_id
- current_assignee_id
- customer_id
- created_at

---

## fault_categories

Stores configurable categories.

Columns

- id
- tenant_id
- parent_category_id
- name
- code
- description
- is_active
- display_order

---

## fault_priorities

Columns

- id
- tenant_id
- name
- code
- severity
- color
- response_sla_minutes
- resolution_sla_minutes
- escalation_level

---

## fault_statuses

Configurable workflow states.

Columns

- id
- tenant_id
- name
- code
- workflow_stage
- is_initial
- is_final
- pause_sla
- display_order

---

## fault_assignments

Assignment history.

Columns

- id
- tenant_id
- fault_id
- assigned_to
- assigned_by
- assignment_type
- strategy
- assigned_at
- accepted_at
- rejected_at
- rejection_reason
- is_current

---

## fault_attempts

Field visit history.

Columns

- id
- tenant_id
- fault_id
- attempt_number
- technician_id
- attempt_type
- outcome
- started_at
- ended_at
- duration_minutes
- latitude
- longitude
- notes
- sync_status

---

## fault_work_logs

- id
- tenant_id
- fault_id
- attempt_id
- technician_id
- work_description
- hours_spent
- created_at

---

## fault_comments

- id
- tenant_id
- fault_id
- comment_type
- comment
- visibility
- created_by
- created_at

---

## fault_attachments

- id
- tenant_id
- fault_id
- attempt_id
- file_name
- storage_path
- mime_type
- size_bytes
- uploaded_by
- uploaded_at

---

## sla_events

Tracks SLA timers.

Columns

- id
- tenant_id
- fault_id
- policy_id
- event_type
- started_at
- paused_at
- resumed_at
- breached_at
- completed_at

---

## escalation_history

Stores escalation events.

Columns

- id
- tenant_id
- fault_id
- escalation_level
- triggered_by
- trigger_type
- action_taken
- created_at

---

## customer_feedback

- id
- tenant_id
- fault_id
- customer_id
- rating
- nps_score
- comments
- submitted_at

---

## root_cause_analysis

- id
- tenant_id
- fault_id
- category
- methodology
- root_cause
- corrective_action
- preventive_action
- investigator_id
- approved_by
- closed_at

---

## workflow_instances

Stores workflow execution.

- id
- tenant_id
- workflow_definition_id
- entity_type
- entity_id
- current_state
- started_at
- completed_at

---

## workflow_history

State transitions.

- id
- workflow_instance_id
- from_state
- to_state
- action
- performed_by
- performed_at

---

## audit_logs

Enterprise audit trail.

- id
- tenant_id
- entity_name
- entity_id
- operation
- old_value
- new_value
- user_id
- device_info
- ip_address
- created_at

---

# 4. Relationships

- One Tenant → Many Faults
- One Fault → Many Assignments
- One Fault → Many Attempts
- One Fault → Many Comments
- One Fault → Many Attachments
- One Fault → Many SLA Events
- One Fault → Many Escalations
- One Fault → One Current Workflow Instance
- One Fault → Zero or One RCA
- One Fault → Zero or One Customer Feedback

---

# 5. Foreign Keys

- faults.tenant_id → tenants.id
- faults.customer_id → customers.id
- faults.status_id → fault_statuses.id
- faults.priority_id → fault_priorities.id
- fault_assignments.fault_id → faults.id
- fault_attempts.fault_id → faults.id
- fault_comments.fault_id → faults.id
- fault_attachments.fault_id → faults.id
- customer_feedback.fault_id → faults.id
- root_cause_analysis.fault_id → faults.id

---

# 6. Multi-Tenant Strategy

Every business table includes:

- tenant_id
- created_by
- updated_by
- created_at
- updated_at

Queries are always filtered by tenant_id except for Super Admin operations.

---

# 7. Soft Delete

Business entities use:

- deleted_at
- deleted_by (optional)

Records are never physically deleted during normal operations.

---

# 8. Performance

Recommended indexes:

- tenant_id + status_id
- tenant_id + current_assignee_id
- tenant_id + priority_id
- tenant_id + created_at
- tenant_id + customer_id
- workflow_instance_id
- fault_number

Use partitioning for audit_logs and large history tables in high-volume deployments.

---

# 9. Security

- Row-Level Security (RLS)
- Encrypted sensitive fields where applicable
- UUID identifiers
- Immutable audit tables
- Attachment access controlled via RBAC

---

# 10. Offline Sync

Operational tables include sync metadata:

- sync_status
- sync_version
- device_id
- last_synced_at

Supports conflict resolution through the platform Sync Engine.

---

# 11. Reporting Views

Recommended materialized views:

- vw_open_faults
- vw_sla_status
- vw_technician_productivity
- vw_repeat_faults
- vw_customer_satisfaction
- vw_escalation_summary
- vw_fault_trends

---

# 12. Future Expansion

Additional entities may include:

- fault_templates
- fault_checklists
- fault_parts_used
- vendor_assignments
- maintenance_plans
- ai_recommendations
- knowledge_links
- predictive_models

---

# Conclusion

This schema provides an enterprise-ready foundation for the Fault Management module, supporting configurable workflows, RBAC, SLA management, assignment, attempts, customer feedback, RCA, analytics, audit logging, offline-first mobile synchronization, and scalable multi-tenant deployments on PostgreSQL.
