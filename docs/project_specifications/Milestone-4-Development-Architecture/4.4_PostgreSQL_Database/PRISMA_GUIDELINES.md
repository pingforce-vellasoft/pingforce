# PRISMA_GUIDELINES.md

> **Document Type:** Enterprise Prisma ORM Guidelines Specification\
> **Purpose:** Define the standards, conventions, architecture, and
> governance that shall be implemented for Prisma ORM within the
> Enterprise Multi-Tenant Workforce Management SaaS Platform.

------------------------------------------------------------------------

# 1. Vision

Prisma shall be the standard ORM and migration framework for the
platform. It shall provide a strongly typed, maintainable, secure, and
scalable data access layer between NestJS services and PostgreSQL while
supporting enterprise-grade multi-tenancy, RBAC, auditing, soft deletes,
workflows, feature flags, and white-label capabilities.

------------------------------------------------------------------------

# 2. Objectives

Prisma usage shall:

-   Standardize database access
-   Provide type-safe queries
-   Support modular development
-   Integrate with PostgreSQL best practices
-   Enable maintainable migrations
-   Reduce SQL-related defects
-   Support enterprise scalability
-   Align with CI/CD automation

------------------------------------------------------------------------

# 3. Architecture Principles

The implementation shall follow:

-   Repository/Service abstraction
-   Domain-driven module organization
-   Type safety
-   Transaction consistency
-   Explicit relations
-   Minimal raw SQL
-   Reusable query patterns
-   Secure data access

------------------------------------------------------------------------

# 4. Technology Stack

-   PostgreSQL 16+
-   Prisma ORM
-   Prisma Migrate
-   NestJS
-   TypeScript
-   Redis (caching where applicable)

------------------------------------------------------------------------

# 5. Schema Organization

The Prisma schema shall model:

-   Platform Core
-   Authentication
-   Tenant
-   Organization
-   Attendance
-   GPS
-   Leave
-   Lead
-   Fault
-   Workflow
-   Notification
-   Audit
-   Reporting
-   Assets
-   Documents
-   Licensing
-   Branding
-   Settings

Business domains shall remain modular.

------------------------------------------------------------------------

# 6. Model Standards

Every model shall define:

-   UUID primary key
-   Audit fields
-   Soft delete fields
-   Tenant ownership where applicable
-   Explicit relations
-   Appropriate indexes
-   Constraints

------------------------------------------------------------------------

# 7. Naming Standards

Prisma models:

-   PascalCase

Database tables:

-   snake_case
-   plural

Fields:

-   camelCase in Prisma
-   snake_case in PostgreSQL using `@map()` where required.

------------------------------------------------------------------------

# 8. Relationships

Relationships shall use:

-   Explicit relation names
-   Foreign keys
-   Junction models for many-to-many
-   Referential integrity
-   UUID references

Circular dependencies shall be avoided.

------------------------------------------------------------------------

# 9. Multi-Tenancy

Tenant-aware models shall include tenant ownership.

Queries shall always enforce tenant context through the application
service layer.

------------------------------------------------------------------------

# 10. Transactions

Interactive transactions shall be used where business consistency
requires multiple operations.

Transactions shall remain short-lived and avoid external network calls.

------------------------------------------------------------------------

# 11. Query Standards

Queries shall:

-   Select only required fields
-   Support pagination
-   Avoid N+1 patterns
-   Use includes/selects intentionally
-   Prefer reusable query builders

------------------------------------------------------------------------

# 12. Raw SQL

Raw SQL shall be exceptional.

It may be used only for:

-   Advanced reporting
-   PostgreSQL-specific features
-   Performance-critical operations

All raw SQL shall be reviewed and parameterized.

------------------------------------------------------------------------

# 13. Migration Standards

Schema changes shall be managed exclusively through Prisma Migrate.

Migration scripts shall be:

-   Version controlled
-   Reviewed
-   Tested
-   Repeatable
-   Compatible with CI/CD

------------------------------------------------------------------------

# 14. Soft Delete

Business models shall support logical deletion.

Repository methods shall exclude deleted entities by default unless
explicitly requested.

------------------------------------------------------------------------

# 15. Auditing

Prisma services shall integrate with the enterprise audit framework.

Critical operations shall generate audit events without embedding audit
logic throughout business code.

------------------------------------------------------------------------

# 16. Performance

Optimization shall include:

-   Batch operations
-   Efficient relation loading
-   Indexed query paths
-   Cursor pagination where appropriate
-   Connection pooling compatibility

------------------------------------------------------------------------

# 17. Security

The data layer shall support:

-   RBAC
-   Tenant isolation
-   Parameterized queries
-   Least privilege
-   Secure secret management
-   Sensitive field protection

------------------------------------------------------------------------

# 18. Testing

Validation shall include:

-   Repository unit tests
-   Integration tests
-   Migration verification
-   Transaction testing
-   Performance validation

------------------------------------------------------------------------

# 19. CI/CD

Pipelines shall validate:

-   Prisma format
-   Schema validation
-   Migration integrity
-   Type generation
-   Test execution

Deployment shall block on migration failures.

------------------------------------------------------------------------

# 20. Anti-Patterns

The implementation shall avoid:

-   Business logic in Prisma models
-   Large unbounded queries
-   SELECT \* equivalents
-   Ignoring transactions
-   Manual schema drift
-   Hard-coded tenant filters
-   Unreviewed raw SQL

------------------------------------------------------------------------

# 21. Future Readiness

The Prisma architecture shall remain compatible with:

-   Read replicas
-   CQRS
-   Event sourcing
-   AI analytics
-   Multi-region deployments
-   Horizontal scaling

------------------------------------------------------------------------

# 22. Validation Checklist

Every module shall verify:

-   Schema consistency
-   Naming compliance
-   Tenant awareness
-   Audit integration
-   Soft delete support
-   Index validation
-   Migration readiness
-   Test coverage

------------------------------------------------------------------------

# Summary

These guidelines define the mandatory Prisma ORM standards that shall be
implemented throughout the Enterprise Multi-Tenant Workforce Management
SaaS Platform. They establish consistent patterns for schema design,
data access, migrations, security, transactions, testing, and long-term
maintainability while aligning with the PostgreSQL architecture and
overall enterprise platform blueprint.
