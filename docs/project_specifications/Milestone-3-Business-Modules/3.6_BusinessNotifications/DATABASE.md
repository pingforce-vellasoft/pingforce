# DATABASE.md

# Business Notifications Module

## Enterprise Multi-Tenant Workforce Management SaaS Platform

**Version:** 2.0 Enterprise\
**Document:** Database Design & Schema Specification\
**Status:** Production Ready

------------------------------------------------------------------------

# 1. Purpose

This document defines the logical database architecture for the Business
Notifications module. The schema supports a configurable, event-driven,
multi-tenant notification platform with RBAC, white-label branding,
localization, workflow integration, reminders, broadcasts,
announcements, escalations, delivery tracking, analytics, and audit
logging.

The design is intended for **PostgreSQL** and follows enterprise
normalization practices while supporting horizontal scalability and
future module expansion.

------------------------------------------------------------------------

# 2. Design Principles

-   Multi-tenant isolation
-   UUID primary keys
-   Soft delete support
-   Audit fields on every table
-   UTC timestamps
-   JSONB for extensible metadata
-   Optimistic locking support
-   Foreign-key integrity
-   Index-first design
-   Event-driven architecture

------------------------------------------------------------------------

# 3. Naming Standards

Primary Key: - id UUID

Common Audit Columns: - tenant_id - organization_id - created_by -
updated_by - created_at - updated_at - deleted_at - version - metadata
JSONB

------------------------------------------------------------------------

# 4. Core Database Modules

1.  Notification Templates
2.  Notification Events
3.  Notification Queue
4.  Delivery Tracking
5.  Broadcast Management
6.  Announcement Management
7.  Reminder Engine
8.  Escalation Engine
9.  User Preferences
10. Channel Configuration
11. Analytics
12. Audit Logging

------------------------------------------------------------------------

# 5. Entity Relationship (High Level)

notification_events ├── notification_templates ├── notification_queue
├── notification_delivery_logs ├── notification_read_receipts └──
notification_analytics

broadcasts ├── broadcast_targets ├── broadcast_channels └──
broadcast_delivery_logs

announcements ├── announcement_targets ├── announcement_reads ├──
announcement_acknowledgements └── announcement_attachments

reminder_rules ├── reminder_schedule └── reminder_history

escalation_rules ├── escalation_levels └── escalation_history

------------------------------------------------------------------------

# 6. Core Tables

## notification_templates

Purpose: Stores reusable templates.

Key Columns: - id - tenant_id - module - category - channel -
template_code - template_name - subject - body_html - body_text -
language - status - version - variables JSONB

Indexes: - tenant_id - template_code - module - channel

------------------------------------------------------------------------

## notification_events

Stores published business events.

Columns: - id - event_code - source_module - priority - correlation_id -
payload JSONB - status - occurred_at

Indexes: - event_code - priority - status - occurred_at

------------------------------------------------------------------------

## notification_queue

Queue for asynchronous processing.

Columns: - id - event_id - channel - recipient_id - scheduled_at -
processing_status - retry_count - next_retry_at

Indexes: - processing_status - scheduled_at - recipient_id

------------------------------------------------------------------------

## notification_delivery_logs

Stores delivery history.

Columns: - id - queue_id - provider - provider_reference -
delivered_at - failure_reason - latency_ms - delivery_status

------------------------------------------------------------------------

## notification_read_receipts

Columns: - id - notification_id - user_id - read_at - clicked_at -
acknowledged

------------------------------------------------------------------------

## broadcasts

Stores broadcast campaigns.

Columns: - id - title - audience_type - approval_status -
schedule_time - publish_time - expiry_time

Child Tables: - broadcast_targets - broadcast_channels -
broadcast_delivery_logs

------------------------------------------------------------------------

## announcements

Stores persistent announcements.

Child Tables: - announcement_targets - announcement_reads -
announcement_acknowledgements - announcement_attachments

------------------------------------------------------------------------

## reminder_rules

Columns: - id - module - trigger_type - cron_expression - recurrence -
escalation_enabled - active

------------------------------------------------------------------------

## reminder_history

Tracks reminder execution.

Columns: - reminder_rule_id - execution_time - status - delivery_count -
escalation_triggered

------------------------------------------------------------------------

## escalation_rules

Columns: - id - module - sla_minutes - escalation_policy - max_levels -
active

------------------------------------------------------------------------

## escalation_levels

Columns: - escalation_rule_id - level_number - recipient_type -
delay_minutes

------------------------------------------------------------------------

## escalation_history

Stores escalation executions.

------------------------------------------------------------------------

## user_notification_preferences

Stores channel, language, quiet-hours and module preferences.

------------------------------------------------------------------------

## notification_channels

Stores provider configuration.

Examples: - FCM - SMTP - WhatsApp - SMS - Webhook

------------------------------------------------------------------------

## notification_provider_logs

Stores provider responses and diagnostics.

------------------------------------------------------------------------

## notification_analytics

Aggregated KPIs: - sent_count - delivered_count - failed_count -
read_count - click_count

------------------------------------------------------------------------

## notification_audit_logs

Stores immutable audit trail for all configuration and lifecycle
actions.

------------------------------------------------------------------------

# 7. Relationships

-   One Event → Many Queue Items
-   One Queue Item → One Delivery Log
-   One Template → Many Events
-   One Broadcast → Many Targets
-   One Announcement → Many Reads
-   One Reminder Rule → Many Executions
-   One Escalation Rule → Many Levels

------------------------------------------------------------------------

# 8. Partitioning Strategy

Recommended partitions: - notification_events (monthly) -
notification_delivery_logs (monthly) - notification_audit_logs (monthly)

------------------------------------------------------------------------

# 9. Index Strategy

Indexes: - tenant_id - organization_id - user_id - status - event_code -
correlation_id - created_at - scheduled_at

GIN Indexes: - metadata JSONB - payload JSONB - variables JSONB

------------------------------------------------------------------------

# 10. Security

-   Tenant isolation
-   Row-Level Security
-   Encrypted provider credentials
-   Audit logging
-   Least privilege database roles

------------------------------------------------------------------------

# 11. Retention

-   Queue: 90 days
-   Delivery Logs: 1 year
-   Audit Logs: 7 years
-   Analytics: Unlimited (aggregated)
-   Read Receipts: Configurable

------------------------------------------------------------------------

# 12. Performance

-   Async queue processing
-   Batch inserts
-   Read replicas
-   Connection pooling
-   Redis caching
-   Materialized reporting views

------------------------------------------------------------------------

# 13. Future Expansion

Additional entities: - AI notification recommendations - Notification
A/B testing - Personalization profiles - Voice notification jobs -
Teams/Slack integrations

------------------------------------------------------------------------

# Version History

  Version   Description
  --------- -------------------------------------------
  1.0       Initial Enterprise Database Design
  2.0       Expanded Multi-Tenant Notification Schema
