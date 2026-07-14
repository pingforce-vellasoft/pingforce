# SOFT_DELETE.md

> **Document Type:** Enterprise PostgreSQL Soft Delete Specification\
> **Purpose:** Define the mandatory soft delete architecture, standards,
> lifecycle, governance, and implementation guidelines that shall be
> implemented across the Enterprise Multi-Tenant Workforce Management
> SaaS Platform.

------------------------------------------------------------------------

# 1. Vision

The platform shall implement a standardized soft delete mechanism that
preserves historical data, maintains referential integrity, enables
recovery, supports auditability, and satisfies enterprise compliance
requirements without relying on physical deletion for business entities.

------------------------------------------------------------------------

# 2. Objectives

The soft delete strategy shall:

-   Preserve business history
-   Prevent accidental data loss
-   Support data recovery
-   Maintain referential integrity
-   Enable regulatory compliance
-   Support auditing
-   Simplify disaster recovery
-   Allow configurable retention policies

------------------------------------------------------------------------

# 3. Guiding Principles

The implementation shall follow these principles:

-   Logical deletion by default
-   Physical deletion only through controlled retention policies
-   Immutable audit history
-   Tenant-aware deletion
-   Recoverable business entities
-   Consistent behavior across all modules
-   Minimal impact on application queries

------------------------------------------------------------------------

# 4. Standard Soft Delete Columns

Every soft-deletable business table shall include the following columns:

-   is_deleted (BOOLEAN)
-   deleted_at (TIMESTAMPTZ)
-   deleted_by (UUID)
-   delete_reason (TEXT)
-   delete_source (TEXT)

Optional metadata:

-   deletion_batch_id
-   retention_expiry_at
-   legal_hold

------------------------------------------------------------------------

# 5. Deletion Lifecycle

Typical lifecycle:

Active → Delete Requested → Soft Deleted → Archived (optional) →
Eligible for Purge → Permanently Deleted (controlled process)

Each transition shall be governed by business rules.

------------------------------------------------------------------------

# 6. Supported Operations

The platform shall support:

-   Soft Delete
-   Restore
-   Archive
-   Retention Validation
-   Permanent Purge
-   Legal Hold

------------------------------------------------------------------------

# 7. Business Rules

Soft deletion shall apply to:

-   Users (where permitted)
-   Employees
-   Attendance
-   Leave Requests
-   Fault Tickets
-   Leads
-   Documents
-   Assets
-   Customers
-   Notification Templates
-   Workflow Definitions

Reference/master data may use different lifecycle policies where
appropriate.

------------------------------------------------------------------------

# 8. Referential Integrity

Soft deletion shall never invalidate foreign key relationships.

Child records shall remain historically accessible unless governed by
independent retention policies.

Cascade physical deletion shall generally be avoided.

------------------------------------------------------------------------

# 9. Query Standards

Operational queries shall exclude soft-deleted records by default.

Administrative reporting may explicitly include:

-   Active records
-   Deleted records
-   Archived records
-   Purged history (metadata only)

Application services shall consistently apply filtering rules.

------------------------------------------------------------------------

# 10. Restore Standards

Authorized users shall be able to restore eligible entities.

Restoration shall:

-   Clear deletion markers
-   Preserve audit history
-   Validate parent relationships
-   Respect business constraints

------------------------------------------------------------------------

# 11. Archival Strategy

Archived records may be moved to dedicated archive storage according to
retention policies.

Archival shall:

-   Preserve identifiers
-   Preserve relationships
-   Preserve audit references
-   Preserve tenant ownership

------------------------------------------------------------------------

# 12. Permanent Purge

Permanent deletion shall occur only when:

-   Retention period expires
-   Legal requirements permit
-   No active legal hold exists
-   Business approval rules are satisfied

Purge operations shall themselves be audited.

------------------------------------------------------------------------

# 13. Tenant Awareness

Every deletion operation shall preserve:

-   tenant_id
-   organization ownership
-   audit ownership

Cross-tenant deletion shall never be permitted except through authorized
platform administration.

------------------------------------------------------------------------

# 14. Audit Integration

Deletion events shall record:

-   Entity
-   Entity ID
-   Tenant
-   Deleted By
-   Deleted At
-   Delete Reason
-   Previous Values
-   Correlation ID
-   Request ID

Audit records shall remain immutable.

------------------------------------------------------------------------

# 15. Security

Deletion privileges shall be governed through RBAC.

Permissions may include:

-   Delete Own
-   Delete Team
-   Delete Department
-   Restore
-   Archive
-   Purge

Physical purge permissions shall be highly restricted.

------------------------------------------------------------------------

# 16. Offline Synchronization

Soft delete operations shall synchronize correctly with offline clients.

The synchronization engine shall support:

-   Delete propagation
-   Conflict detection
-   Restore synchronization
-   Retry processing

------------------------------------------------------------------------

# 17. Reporting

Reports shall support filtering by:

-   Active
-   Deleted
-   Archived
-   Purged (metadata)

Historical analytics shall remain available even after soft deletion.

------------------------------------------------------------------------

# 18. Performance Considerations

The implementation shall optimize:

-   Partial indexes on active records
-   Query plans excluding deleted rows
-   Partitioning for archival datasets
-   Efficient purge processing

Large historical datasets shall not negatively impact transactional
workloads.

------------------------------------------------------------------------

# 19. Compliance

The strategy shall support:

-   GDPR-aware deletion workflows
-   Regulatory retention policies
-   Legal hold requirements
-   Compliance reporting
-   Secure archival

Business rules shall determine when physical deletion is legally
permissible.

------------------------------------------------------------------------

# 20. Monitoring

Operational monitoring shall include:

-   Delete activity
-   Restore activity
-   Purge activity
-   Archive jobs
-   Retention violations
-   Storage utilization

------------------------------------------------------------------------

# 21. Future Readiness

The soft delete architecture shall remain compatible with:

-   Event sourcing
-   CQRS
-   Data warehouse integration
-   AI analytics
-   Cross-region deployments
-   Enterprise archival solutions

------------------------------------------------------------------------

# 22. Validation Checklist

Every soft-deletable table shall ensure:

-   Standard deletion columns
-   Audit integration
-   Tenant awareness
-   Restore capability
-   Retention policy support
-   Security validation
-   Performance validation

------------------------------------------------------------------------

# Summary

This document defines the enterprise soft delete architecture that shall
be implemented throughout the Enterprise Multi-Tenant Workforce
Management SaaS Platform. The strategy shall provide recoverable logical
deletion, preserve historical integrity, maintain referential
consistency, satisfy audit and compliance requirements, and support
long-term scalability while minimizing operational risk.
