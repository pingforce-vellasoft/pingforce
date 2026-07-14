# TECH_STACK.md

# Enterprise Workforce Platform

## Official Technology Stack Specification

**Version:** 1.0.0
**Status:** Approved
**Owner:** Architecture Team

---

# 1. Purpose

This document defines the official technology stack, engineering rationale, supported versions, architectural principles, governance rules, and implementation standards for the Enterprise Workforce Platform.

It is the single source of truth for technology selection.

---

# 2. Architecture Principles

The platform is designed around the following principles:

- Cloud Native
- AI Native
- Multi-Tenant
- White-Label Ready
- API First
- Mobile First
- Offline First
- Documentation First
- Security by Design
- Infrastructure as Code
- Automation First
- Enterprise Scalability

---

# 3. High-Level Stack

| Layer           | Technology                  | Purpose                          |
| --------------- | --------------------------- | -------------------------------- |
| Web Admin       | Angular 21                  | Enterprise administration portal |
| Mobile          | Flutter (Stable)            | Android & iOS application        |
| Backend         | NestJS                      | REST APIs and business services  |
| Language        | TypeScript                  | Web & Backend                    |
| Mobile Language | Dart                        | Flutter development              |
| Database        | PostgreSQL 16+              | Primary transactional database   |
| ORM             | Prisma                      | Type-safe data access            |
| Cache           | Redis                       | Caching and session data         |
| Queue           | BullMQ                      | Background jobs                  |
| Auth            | JWT + Refresh Tokens        | Authentication                   |
| Storage         | OCI Object Storage          | Documents & media                |
| Container       | Docker                      | Packaging                        |
| Cloud           | Oracle Cloud Infrastructure | Production hosting               |
| CI/CD           | GitHub Actions              | Build & deployment               |
| Monitoring      | Prometheus + Grafana        | Metrics                          |
| Logging         | Structured JSON             | Centralized observability        |

---

# 4. Frontend (Angular)

## Selected Version

- Angular 21
- TypeScript (latest compatible)
- Angular Material 3

## Standards

- Standalone Components
- Standalone Routing
- Signals-first state management
- RxJS for async streams
- Lazy-loaded feature modules
- Route Guards
- HTTP Interceptors
- Reactive Forms
- Feature-based folder structure

## Recommended Libraries

- Angular Material
- RxJS
- ngx-translate
- Chart.js
- ngx-toastr
- Leaflet / Google Maps (GPS)
- ngx-mask

---

# 5. Mobile (Flutter)

## Standards

- Flutter Stable
- Riverpod
- Clean Architecture
- Offline-first synchronization

## Recommended Packages

- dio
- go_router
- hive
- flutter_secure_storage
- geolocator
- permission_handler
- firebase_messaging
- freezed
- json_serializable

---

# 6. Backend (NestJS)

## Core Framework

- NestJS
- TypeScript
- Node.js LTS

## Architecture

- Modular design
- Dependency Injection
- DTO validation
- Repository Pattern
- Clean Architecture
- Feature modules
- OpenAPI (Swagger)

## Libraries

- Prisma
- class-validator
- class-transformer
- Passport
- JWT
- BullMQ
- Redis

---

# 7. Database

Primary database: PostgreSQL

Mandatory standards:

- UUID primary keys
- tenant_id for all business tables
- created_at
- updated_at
- created_by
- updated_by
- deleted_at (soft delete)

Indexes:

- tenant_id
- Foreign keys
- Frequently searched columns

Transactions are mandatory for multi-table business operations.

---

# 8. DevOps

## Containers

- Docker
- Multi-stage builds

## CI/CD

GitHub Actions pipeline:

1. Install
2. Lint
3. Unit Tests
4. Build
5. Security Scan
6. Package
7. Deploy
8. Smoke Tests

---

# 9. Oracle Cloud Infrastructure

Production services:

- Compute
- Load Balancer
- Virtual Cloud Network
- Object Storage
- Vault
- Monitoring
- Logging

---

# 10. Security

Mandatory controls:

- HTTPS only
- JWT
- Refresh Tokens
- RBAC
- Tenant Isolation
- CSP
- Input validation
- Audit logging
- Secrets in OCI Vault
- Encryption in transit
- Encryption at rest

Reference: OWASP Top 10.

---

# 11. AI Engineering Stack

Primary tools:

- ChatGPT
- Antigravity
- Stitch MCP
- GitHub Copilot

Documentation standards:

- Markdown
- ADRs
- Mermaid diagrams
- PRDs
- Prompt libraries

AI-generated code must pass architecture, security, QA and human review.

---

# 12. Quality Tooling

Mandatory:

- ESLint
- Prettier
- SonarQube / SonarCloud
- Jest
- Playwright
- Flutter Test
- Postman / Bruno collections

---

# 13. Version Management

Use Semantic Versioning.

Approved baseline:

- Angular 21+
- Flutter Stable
- Node.js LTS
- NestJS LTS
- PostgreSQL 16+
- Prisma Latest Stable

Technology upgrades require:

1. Compatibility assessment
2. Architecture review
3. ADR approval
4. Regression testing

---

# 14. Technologies Evaluated

Rejected:

- React (Angular selected for enterprise consistency)
- Laravel (NestJS selected for unified TypeScript stack)
- MySQL (PostgreSQL selected for advanced enterprise features)
- MongoDB (relational domain model preferred)

---

# 15. Governance

Technology changes require:

- New ADR
- Architecture review
- Product approval
- CHANGELOG update
- PROJECT_STATE update

This document is the authoritative technology reference for the Enterprise Workforce Platform.
