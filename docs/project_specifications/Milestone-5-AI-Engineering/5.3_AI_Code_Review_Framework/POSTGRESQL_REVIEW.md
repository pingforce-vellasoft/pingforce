# POSTGRESQL_REVIEW.md

# AI_Code_Review -- PostgreSQL Enterprise Review Guide

## Purpose

This document defines the enterprise review framework for PostgreSQL
database schemas, SQL scripts, migrations, stored procedures, triggers,
indexing strategies, and operational practices reviewed by the
AI_Code_Review module.

It supports an Enterprise Multi-Tenant SaaS platform using PostgreSQL,
Prisma ORM, Redis, and cloud-native deployments.

------------------------------------------------------------------------

# Objectives

-   Enforce enterprise database standards
-   Validate schema quality and normalization
-   Ensure tenant isolation
-   Prevent data integrity issues
-   Optimize query performance
-   Verify migration safety
-   Improve scalability and operational readiness

------------------------------------------------------------------------

# Review Workflow

``` text
Schema / Migration / SQL Change
            │
 PostgreSQL Context Builder
            │
 AI PostgreSQL Review Engine
 ├── Schema Analysis
 ├── Naming Standards
 ├── Constraints
 ├── Index Review
 ├── Query Analysis
 ├── Migration Review
 ├── Security Review
 ├── Multi-Tenancy Validation
 ├── Performance Review
 ├── Backup & Recovery Validation
 └── Documentation Review
            │
 Risk Scoring
            │
 Human DBA Review (if required)
            │
 Approval / Rework
```

------------------------------------------------------------------------

# Schema Design Review

Validate:

-   Third Normal Form (or justified denormalization)
-   Consistent naming conventions
-   Appropriate data types
-   Primary/foreign keys
-   NOT NULL constraints
-   CHECK constraints
-   Unique constraints
-   Default values
-   Partitioning strategy (when required)

------------------------------------------------------------------------

# Multi-Tenant Review

Ensure:

-   Tenant identifier on shared tables
-   Row-level security compatibility
-   Cross-tenant isolation
-   Tenant-aware indexes
-   Tenant-safe reporting
-   No cross-tenant joins without authorization

------------------------------------------------------------------------

# Migration Review

-   Forward-only migrations
-   Rollback strategy documented
-   Idempotent scripts where applicable
-   Zero-downtime approach
-   Data backfill plan
-   Migration ordering
-   Lock impact assessment

------------------------------------------------------------------------

# Index Review

Check:

-   Missing indexes
-   Duplicate indexes
-   Composite index order
-   Covering indexes
-   Partial indexes
-   Expression indexes
-   Index bloat considerations

------------------------------------------------------------------------

# Query Review

Evaluate:

-   EXPLAIN / EXPLAIN ANALYZE
-   Sequential scans
-   Join efficiency
-   N+1 patterns
-   Aggregation strategy
-   Pagination
-   CTE usage
-   Window functions
-   Lock contention

------------------------------------------------------------------------

# Security Review

Validate:

-   Least-privilege roles
-   RBAC compatibility
-   Parameterized queries
-   SQL injection prevention
-   Encryption at rest
-   TLS in transit
-   Secrets management
-   Audit logging
-   Sensitive column protection

------------------------------------------------------------------------

# Performance Review

Review:

-   Connection pooling
-   Vacuum strategy
-   Autovacuum configuration
-   Statistics freshness
-   Slow query analysis
-   Memory settings
-   Parallel query usage
-   Replication readiness

------------------------------------------------------------------------

# Backup & Recovery

Verify:

-   Automated backups
-   PITR readiness
-   WAL retention
-   Restore testing
-   Disaster recovery objectives
-   Replication health

------------------------------------------------------------------------

# Prisma Compatibility

-   Schema alignment
-   Migration compatibility
-   Relation mappings
-   Enum consistency
-   Cascade rules
-   Generated client stability

------------------------------------------------------------------------

# Testing Checklist

-   Migration tests
-   Referential integrity tests
-   Performance benchmarks
-   Load tests
-   Backup/restore validation
-   Security validation
-   Regression tests

------------------------------------------------------------------------

# Documentation Review

Confirm updates to:

-   ER diagrams
-   Schema documentation
-   Migration notes
-   Operational runbooks
-   Backup procedures
-   Performance tuning notes

------------------------------------------------------------------------

# AI Review Outputs

-   Database Quality Score
-   Schema Compliance Score
-   Performance Score
-   Security Score
-   Index Health Score
-   Migration Risk Score
-   Technical Debt Estimate
-   Optimization Recommendations
-   Merge Recommendation

------------------------------------------------------------------------

# Blocking Criteria

Block deployment when:

-   Data loss risk exists
-   Unsafe destructive migrations
-   Missing tenant isolation
-   Critical security vulnerabilities
-   Broken referential integrity
-   Severe performance regressions
-   Backup strategy incomplete

------------------------------------------------------------------------

# Best Practices

-   Prefer explicit constraints.
-   Keep migrations small and reversible.
-   Benchmark complex queries.
-   Index based on workload, not assumptions.
-   Review execution plans before production.
-   Monitor bloat and autovacuum continuously.
-   Audit all privileged database changes.

------------------------------------------------------------------------

# Repository Layout

``` text
AI_Code_Review/
├── README.md
├── WORKFLOW.md
├── REVIEW_PROCESS.md
├── ROLE_LIBRARY.md
├── REVIEW_CHECKLISTS.md
├── ARCHITECTURE_REVIEW.md
├── ANGULAR_REVIEW.md
├── FLUTTER_REVIEW.md
├── NESTJS_REVIEW.md
├── POSTGRESQL_REVIEW.md
├── CHANGELOG.md
├── PROJECT_STATE.md
├── rules/
├── templates/
└── reports/
```

------------------------------------------------------------------------

**Version:** 1.0.0

**Status:** Enterprise Production Blueprint
