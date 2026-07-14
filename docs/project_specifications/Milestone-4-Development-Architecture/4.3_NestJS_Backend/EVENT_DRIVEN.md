# EVENT_DRIVEN.md

> **Enterprise Multi-Tenant Workforce Management SaaS Platform**
>
> **Purpose:** This document defines the Event-Driven Architecture (EDA) that shall be implemented within the NestJS backend. It establishes how business events, asynchronous processing, background jobs, integrations, notifications, and future distributed services will communicate while remaining loosely coupled.

---

# 1. Objectives

The Event-Driven Architecture shall:

- Decouple business modules.
- Improve scalability.
- Reduce direct module dependencies.
- Support asynchronous processing.
- Simplify future microservice migration.
- Improve reliability and fault isolation.
- Enable extensible integrations.

---

# 2. Architectural Principles

The event platform shall follow:

- Loose coupling
- High cohesion
- Publish / Subscribe pattern
- Asynchronous communication
- Eventual consistency where appropriate
- Idempotent event processing
- Retryable execution
- Observable processing

---

# 3. Event Categories

## Domain Events

Business events generated inside a bounded context.

Examples:

- UserCreated
- AttendanceCheckedIn
- AttendanceCheckedOut
- LeaveApproved
- FaultAssigned
- FaultResolved
- LeadCreated
- LeadConverted
- AssetAssigned

## Application Events

System coordination events.

Examples:

- ReportGenerationRequested
- NotificationRequested
- SyncStarted
- SyncCompleted

## Integration Events

Events intended for external systems.

Examples:

- WebhookTriggered
- CRMLeadExported
- PaymentReceived
- ThirdPartySyncCompleted

## Infrastructure Events

Operational events.

Examples:

- CacheInvalidated
- QueueRetryScheduled
- BackupCompleted
- LicenseValidationCompleted

---

# 4. Event Flow

```text
Client Request
      │
Business Validation
      │
Domain Logic
      │
Domain Event Published
      │
───────────────┬──────────────────
               │
      Event Subscribers
               │
 ┌─────────────┼───────────────┐
 │             │               │
Notifications  Audit       Background Jobs
 │             │               │
Analytics   Integrations   Workflow Engine
```

---

# 5. Event Lifecycle

Every event should follow:

1. Event Creation
2. Validation
3. Publishing
4. Queueing (if asynchronous)
5. Subscriber Processing
6. Retry (if required)
7. Dead Letter Handling
8. Audit Logging
9. Monitoring

---

# 6. Event Structure

Every event should contain:

- Event ID
- Event Name
- Aggregate ID
- Aggregate Type
- Tenant ID
- Organization ID
- Correlation ID
- Causation ID
- Timestamp
- Event Version
- Payload
- Metadata

---

# 7. Naming Standards

Past-tense names should be used.

Examples:

- UserCreated
- UserUpdated
- AttendanceApproved
- AttendanceRejected
- FaultEscalated
- LeadAssigned
- CustomerRegistered
- AssetReturned

---

# 8. Publishing Strategy

Modules shall publish events only after successful business validation and transaction completion where consistency requires it.

Business events shall represent facts that have already occurred.

---

# 9. Subscription Strategy

Subscribers shall:

- Remain independent.
- Avoid circular dependencies.
- Process events asynchronously when practical.
- Be idempotent.
- Handle retries gracefully.

---

# 10. Queue Architecture

The event platform shall support queues for:

- Notifications
- Email
- WhatsApp
- SMS
- Push Messages
- Report Generation
- File Processing
- Data Synchronization
- Imports
- Exports

Queue priorities should support:

- High
- Medium
- Low
- Background

---

# 11. Retry Strategy

The platform should support:

- Configurable retry counts
- Exponential backoff
- Retry delay
- Retry logging
- Permanent failure detection
- Dead Letter Queue (DLQ)

---

# 12. Dead Letter Queue

Failed events that exceed retry limits shall be moved to a DLQ.

Administrators should be able to:

- Inspect failures
- Replay events
- Discard events
- Export failure details

---

# 13. Idempotency

Subscribers shall safely process duplicate deliveries.

Idempotency strategies may include:

- Event ID tracking
- Processed event registry
- Version validation
- Optimistic concurrency

---

# 14. Transaction Boundaries

Business transactions should remain independent from long-running asynchronous work.

Time-consuming operations should be initiated through events instead of blocking user requests.

---

# 15. Event Consumers

Potential consumers include:

- Workflow Engine
- Notification Engine
- Audit Engine
- Reporting Engine
- Analytics Engine
- Search Index
- File Processor
- Mobile Sync Engine
- External Integrations

---

# 16. Multi-Tenant Considerations

Events shall carry tenant context including:

- Tenant ID
- Organization ID
- Branch ID (if applicable)
- User ID
- Session ID

Consumers shall never process events outside their authorized tenant context.

---

# 17. Observability

The event platform shall provide:

- Correlation IDs
- Distributed tracing
- Processing latency
- Queue metrics
- Retry metrics
- Failure metrics
- Subscriber performance

---

# 18. Security

Events shall support:

- Payload validation
- Sensitive data masking
- Encryption where required
- Authorization before publishing integration events
- Audit logging
- Secure transport

---

# 19. Future Evolution

The architecture shall support future adoption of:

- Kafka
- RabbitMQ
- NATS
- Cloud-native event buses
- Event sourcing (selected domains)
- CQRS where beneficial

without changing domain models.

---

# 20. Governance

Every new module shall:

- Define published events.
- Document subscribers.
- Version event contracts.
- Follow naming conventions.
- Support retries and idempotency.
- Integrate with monitoring and auditing.

---

# Document Status

**Version:** 1.0

**Status:** Event-Driven Architecture Specification

**Purpose:** Defines the event-driven communication model that shall be implemented across the NestJS backend to enable scalable, loosely coupled, and extensible enterprise services.
