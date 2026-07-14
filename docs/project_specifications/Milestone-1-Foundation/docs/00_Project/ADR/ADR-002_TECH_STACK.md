# ADR-002: Technology Stack Standardization

**ADR ID:** ADR-002  
**Status:** Accepted  
**Date:** 2026-07-01

# 1. Purpose

This Architecture Decision Record defines the official technology stack for the Enterprise Workforce Platform. It standardizes technologies across web, mobile, backend, infrastructure, database, DevOps and AI engineering to ensure long-term maintainability, scalability and developer productivity.

# 2. Decision Drivers

- Enterprise scalability
- Multi-tenant SaaS architecture
- Offline-first mobile support
- Cross-platform development
- Strong TypeScript ecosystem
- OCI deployment
- AI-assisted development
- Low operational cost
- Open standards
- High community support

# 3. Approved Technology Stack

| Layer | Technology | Decision |
|-------|------------|----------|
| Web Admin | Angular 21 | Primary web framework |
| Mobile | Flutter | Android & iOS from one codebase |
| Backend | NestJS | Modular enterprise backend |
| Language | TypeScript | Web & Backend |
| Mobile Language | Dart | Flutter |
| Database | PostgreSQL | Primary relational database |
| ORM | Prisma | Database access |
| Cache | Redis | Caching & queues |
| Queue | BullMQ | Background jobs |
| Authentication | JWT + Refresh Tokens | Stateless authentication |
| Storage | OCI Object Storage | Files & media |
| CI/CD | GitHub Actions | Build & deployment |
| Containers | Docker | Standard runtime |
| Cloud | Oracle Cloud Infrastructure | Production |
| Monitoring | Prometheus + Grafana | Metrics |
| Logging | Structured JSON Logs | Centralized logging |

# 4. Frontend

Angular 21 is selected because of:
- Standalone APIs
- Signals
- Enterprise architecture
- Strong TypeScript support
- Excellent tooling
- Long-term support

Use:
- Angular Material 3
- RxJS
- Signals-first state
- Lazy loading
- Route Guards
- Feature-based architecture

# 5. Mobile

Flutter is selected because it provides:
- Single Android/iOS codebase
- High performance
- Native rendering
- Strong GPS support
- Offline-first capability

Packages:
- Riverpod
- go_router
- dio
- hive
- flutter_secure_storage
- geolocator
- firebase_messaging

# 6. Backend

NestJS provides:
- Modular architecture
- Dependency Injection
- Guards
- Interceptors
- Validation
- Swagger
- Testing support

Patterns:
- Clean Architecture
- Repository Pattern
- CQRS where beneficial
- Domain-driven module boundaries

# 7. Database

PostgreSQL is the system of record.

Standards:
- UUID primary keys
- tenant_id on business entities
- Soft delete
- Audit fields
- Proper indexing
- Transactions

# 8. Infrastructure

Deployment target:
- OCI Compute
- OCI Load Balancer
- OCI Object Storage
- OCI Vault
- OCI Networking

Containerization:
- Docker
- Multi-stage builds

# 9. Security Standards

- HTTPS only
- JWT Authentication
- Refresh Tokens
- RBAC
- Tenant Isolation
- Input Validation
- OWASP Top 10 compliance
- Audit Logging
- Secrets stored in OCI Vault

# 10. AI Engineering Stack

Development tools:
- ChatGPT
- Antigravity
- Stitch MCP
- GitHub Copilot

Documentation:
- Markdown
- Mermaid diagrams
- ADRs
- PRDs

# 11. Technologies Not Selected

- React (Angular chosen for enterprise consistency)
- Laravel (NestJS preferred for TypeScript ecosystem)
- MySQL (PostgreSQL chosen for advanced features)
- MongoDB (relational model better fits requirements)

# 12. Version Management

- Angular 21+
- Flutter Stable
- Node.js LTS
- NestJS Latest LTS
- PostgreSQL 16+
- Prisma Latest Stable

# 13. Governance

Technology changes require:
1. New ADR
2. Architecture review
3. Impact assessment
4. Approval by architecture owners

# 14. Consequences

Benefits:
- Unified engineering standards
- Simplified onboarding
- Lower maintenance cost
- Better scalability
- Consistent development practices

Trade-offs:
- Team must maintain expertise in selected technologies.
- Framework upgrades require governance.

# 15. Related ADRs

- ADR-001 Multi-Tenancy
- ADR-003 Authentication
- ADR-004 RBAC
