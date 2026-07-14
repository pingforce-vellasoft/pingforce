# ADR-001: Multi-Tenancy Architecture

**Status:** Accepted

## 1. Context

The Enterprise Workforce Platform is a multi-tenant SaaS platform serving multiple independent clients from a single deployment.

Core objectives:

- Unlimited tenants
- Complete tenant isolation
- White-label branding
- Tenant-specific configuration
- Independent RBAC
- Shared infrastructure
- OCI deployment readiness

## 2. Decision

Use a **Shared Application + Shared PostgreSQL Database + Logical Isolation** architecture.

Every business table contains a mandatory `tenant_id`.

Every authenticated request resolves tenant context before any business logic executes.

## 3. Architecture

Internet
→ Load Balancer
→ Angular Admin / Flutter Mobile
→ NestJS API
→ Authentication
→ Tenant Resolver
→ RBAC
→ Business Services
→ PostgreSQL

## 4. Tenant Resolution

Priority:

1. JWT tenant_id
2. Custom domain
3. Client code
4. API key

Requests without tenant context are rejected.

## 5. Database Strategy

Mandatory columns:

- tenant_id
- created_by
- created_at
- updated_at
- deleted_at

Indexes:

- tenant_id
- tenant_id + status
- tenant_id + created_at

## 6. Isolation Rules

- Every query filters by tenant_id.
- Cross-tenant access is prohibited.
- Super Admin bypass exists only for platform administration.

## 7. White Label

Each tenant owns:

- Logo
- Theme
- Colors
- Domain
- Feature flags
- Email templates
- Notification templates

## 8. Security

- JWT contains tenant_id
- RBAC evaluated within tenant scope
- Audit logging
- Encryption in transit and at rest

## 9. Scalability

Supports:

- Thousands of tenants
- Millions of users
- Horizontal NestJS scaling
- Redis caching
- PostgreSQL read replicas
- Oracle Cloud Infrastructure

## 10. Alternatives Considered

### Separate database per tenant

Pros:

- Strong isolation

Cons:

- Higher operational cost

Decision: Rejected.

### Shared database with logical isolation

Chosen for scalability, maintainability and cost efficiency.

## 11. Implementation Rules

- No repository without tenant_id
- No API before tenant resolution
- Tenant-aware caches
- tenant_id in all integration events

## 12. Acceptance Criteria

- Tenant A cannot access Tenant B data
- Branding isolated
- Feature flags isolated
- Reports tenant-scoped
- Audit logs include tenant_id

## 13. Related ADRs

- ADR-002 Authentication
- ADR-003 RBAC
- ADR-004 White Label
- ADR-005 Settings
