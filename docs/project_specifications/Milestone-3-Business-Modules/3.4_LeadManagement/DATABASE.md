# Lead Management Module

# DATABASE.md

## Document Information

  Item       Value
  ---------- --------------------------------------
  Module     Lead Management
  Document   Database Design Specification
  Platform   Enterprise Workforce Management SaaS
  Database   PostgreSQL
  Version    1.0
  Status     Production Ready

------------------------------------------------------------------------

# 1. Overview

This document defines the logical database design for the Lead
Management module. The schema is designed for a multi-tenant SaaS
platform with complete tenant isolation, RBAC, auditability,
scalability, workflow support, reporting, and white-label deployments.

## Design Principles

-   Multi-tenant by design
-   UUID primary keys
-   Soft delete support
-   Audit fields on every table
-   Optimized indexing
-   JSONB for configurable metadata
-   Row-level security compatible
-   Horizontal scalability

------------------------------------------------------------------------

# 2. Core Tables

## leads

Stores master lead records.

### Important Columns

-   id (UUID, PK)
-   tenant_id (UUID)
-   lead_number
-   first_name
-   last_name
-   company_name
-   mobile
-   alternate_mobile
-   email
-   source_id
-   campaign_id
-   owner_user_id
-   status_id
-   priority_id
-   pipeline_stage_id
-   qualification_score
-   expected_value
-   currency_code
-   tags (JSONB)
-   custom_fields (JSONB)
-   created_at
-   updated_at
-   deleted_at

Indexes: - tenant_id - mobile - email - company_name - owner_user_id -
status_id

------------------------------------------------------------------------

## lead_addresses

Stores multiple addresses.

Fields: - id - lead_id - address_type - line1 - line2 - city -
district - state - country - postal_code - latitude - longitude

------------------------------------------------------------------------

## lead_sources

Configurable lead sources.

Examples: - Website - Facebook - Instagram - Google Forms - Referral -
API - Import

------------------------------------------------------------------------

## lead_campaigns

Campaign master: - campaign_name - medium - utm_source - utm_campaign -
budget - active_flag

------------------------------------------------------------------------

## lead_pipeline_stages

Configurable tenant stages: - stage_name - sequence_no - color -
sla_hours - workflow_config (JSONB)

------------------------------------------------------------------------

## lead_assignments

Assignment history: - lead_id - assigned_to - assigned_by -
assignment_type - rule_name - assigned_at - accepted_at - released_at

------------------------------------------------------------------------

## lead_followups

Stores all follow-ups: - lead_id - scheduled_date - reminder_time -
followup_type - outcome - notes - completed_at - assigned_user

------------------------------------------------------------------------

## lead_activities

Activity history: - lead_id - activity_type - activity_datetime -
duration - notes - attachment_id - gps_location

------------------------------------------------------------------------

## quotations

Quotation master: - quotation_number - lead_id - version_no - status -
subtotal - tax_amount - discount_amount - total_amount - valid_until

------------------------------------------------------------------------

## quotation_items

Line items: - quotation_id - product_id - description - quantity -
unit_price - discount - tax - line_total

------------------------------------------------------------------------

## customer_conversions

Conversion history: - lead_id - customer_id - organization_id -
opportunity_id - project_id - converted_by - converted_at

------------------------------------------------------------------------

## duplicate_reviews

Duplicate processing: - lead_id - duplicate_lead_id - matching_score -
review_status - decision_by - reviewed_at

------------------------------------------------------------------------

## lead_documents

Attachments: - lead_id - file_name - storage_path - mime_type -
uploaded_by

------------------------------------------------------------------------

## lead_notes

Internal notes: - lead_id - note_text - visibility - created_by

------------------------------------------------------------------------

## lead_tags

Tag master.

------------------------------------------------------------------------

## lead_tag_mapping

Many-to-many mapping.

------------------------------------------------------------------------

## notification_log

Lead notification history.

------------------------------------------------------------------------

## workflow_history

Workflow execution history.

------------------------------------------------------------------------

## audit_log

Complete audit information: - entity_name - entity_id - operation -
previous_value (JSONB) - new_value (JSONB) - user_id - tenant_id -
ip_address - device - created_at

------------------------------------------------------------------------

# 3. Relationships

Tenant └── Leads ├── Addresses ├── Activities ├── Follow-ups ├──
Assignments ├── Documents ├── Notes ├── Quotations │ └── Quotation Items
├── Customer Conversion └── Duplicate Reviews

------------------------------------------------------------------------

# 4. Common Reference Tables

-   priorities
-   statuses
-   departments
-   branches
-   regions
-   teams
-   users
-   products
-   currencies
-   tax_rates
-   notification_templates

------------------------------------------------------------------------

# 5. Constraints

-   Unique lead_number per tenant
-   Unique quotation_number per tenant
-   Foreign keys enforced
-   Soft delete only
-   Tenant isolation mandatory

------------------------------------------------------------------------

# 6. Index Strategy

Indexes on: - tenant_id - owner_user_id - status_id -
pipeline_stage_id - mobile - email - company_name - scheduled_date -
converted_at

Composite: - (tenant_id,status_id) - (tenant_id,owner_user_id) -
(tenant_id,mobile) - (tenant_id,email)

------------------------------------------------------------------------

# 7. Partitioning

Recommended: - audit_log by month - notification_log by month -
activities by tenant/date - followups by month

------------------------------------------------------------------------

# 8. Security

-   Row Level Security
-   Encrypted sensitive fields
-   UUID identifiers
-   Audit triggers
-   Read-only historical records

------------------------------------------------------------------------

# 9. Performance

-   Connection pooling
-   JSONB indexes
-   Materialized reporting views
-   Async audit logging
-   Background archival

------------------------------------------------------------------------

# 10. Future Tables

-   ai_lead_scores
-   lead_predictions
-   customer360
-   conversation_history
-   marketing_attribution
-   cpq_pricing

------------------------------------------------------------------------

# 11. Acceptance Criteria

-   Fully normalized schema
-   Multi-tenant ready
-   Workflow compatible
-   Reporting optimized
-   RBAC compatible
-   Audit compliant
-   Scalable for millions of records
