# PROJECT_STRUCTURE.md

> **Enterprise Multi-Tenant Workforce Management SaaS Platform**
>
> **Purpose:** This document defines the recommended project structure that shall be adopted for the NestJS backend. It serves as the blueprint for organizing source code, modules, shared libraries, configuration, testing, deployment, and future scalability.

---

# 1. Objectives

The backend project structure shall:

- Support enterprise-scale development.
- Encourage clear separation of concerns.
- Enable modular feature development.
- Simplify onboarding for new developers.
- Support future migration to microservices.
- Promote reuse of shared components.
- Minimize coupling between business domains.

---

# 2. Guiding Principles

- Domain Driven Design (DDD)
- Clean Architecture
- Modular Monolith (initial phase)
- Feature-first organization
- Shared infrastructure separated from business logic
- Configuration-driven behavior
- Testability
- Scalability

---

# 3. High-Level Folder Structure

```text
nestjs-backend/
│
├── docs/
├── scripts/
├── prisma/
├── docker/
├── deployments/
├── config/
├── src/
├── test/
├── uploads/
├── logs/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env
├── .env.example
└── README.md
```

---

# 4. Source Structure

```text
src/
├── main.ts
├── app.module.ts
├── bootstrap/
├── config/
├── core/
├── modules/
├── integrations/
├── jobs/
├── shared/
└── infrastructure/
```

---

# 5. Bootstrap Layer

Responsible for application startup.

```text
bootstrap/
├── app.bootstrap.ts
├── logger.bootstrap.ts
├── validation.bootstrap.ts
├── swagger.bootstrap.ts
├── security.bootstrap.ts
└── shutdown.bootstrap.ts
```

Responsibilities include:

- Environment loading
- Global pipes
- Global filters
- Swagger
- CORS
- Helmet
- Logging
- Graceful shutdown

---

# 6. Configuration Layer

```text
config/
├── app.config.ts
├── database.config.ts
├── redis.config.ts
├── jwt.config.ts
├── storage.config.ts
├── notification.config.ts
├── queue.config.ts
└── feature.config.ts
```

Configuration shall remain centralized and environment driven.

---

# 7. Core Platform Modules

```text
core/
├── authentication/
├── authorization/
├── tenant/
├── licensing/
├── module-engine/
├── feature-flags/
├── workflow/
├── approval/
├── notification/
├── audit/
├── settings/
├── branding/
├── reporting/
└── analytics/
```

These modules provide reusable platform capabilities.

---

# 8. Business Modules

```text
modules/
├── attendance/
├── gps/
├── leave/
├── faults/
├── leads/
├── users/
├── customers/
├── assets/
├── documents/
├── reports/
└── dashboard/
```

Each module shall encapsulate its own controllers, services, DTOs, entities, validation, and business rules.

---

# 9. Standard Feature Module Layout

```text
attendance/
├── controllers/
├── services/
├── dto/
├── entities/
├── repositories/
├── validators/
├── guards/
├── events/
├── listeners/
├── interfaces/
├── constants/
├── enums/
├── attendance.module.ts
└── index.ts
```

---

# 10. Shared Components

```text
shared/
├── decorators/
├── guards/
├── interceptors/
├── filters/
├── pipes/
├── middleware/
├── exceptions/
├── constants/
├── enums/
├── interfaces/
├── utils/
└── types/
```

Shared code shall remain framework-agnostic wherever practical.

---

# 11. Infrastructure Layer

```text
infrastructure/
├── database/
├── cache/
├── storage/
├── mail/
├── sms/
├── whatsapp/
├── queue/
├── scheduler/
└── monitoring/
```

---

# 12. Integrations

```text
integrations/
├── firebase/
├── maps/
├── payment/
├── webhook/
├── oauth/
└── third-party/
```

---

# 13. Background Jobs

```text
jobs/
├── attendance-sync/
├── notification/
├── reports/
├── cleanup/
├── backups/
└── scheduler/
```

---

# 14. Prisma

```text
prisma/
├── schema.prisma
├── migrations/
├── seed/
└── generators/
```

---

# 15. Testing Structure

```text
test/
├── unit/
├── integration/
├── e2e/
├── performance/
├── security/
└── fixtures/
```

---

# 16. Documentation

```text
docs/
├── api/
├── architecture/
├── deployment/
├── database/
├── standards/
└── decisions/
```

---

# 17. Coding Conventions

The structure shall encourage:

- Small focused modules
- Thin controllers
- Business logic in services
- Repository abstraction
- DTO validation
- Dependency injection
- Reusable utilities
- Consistent naming

---

# 18. Scalability

The structure shall allow future extraction of modules into independent services with minimal refactoring while preserving public API compatibility.

---

# 19. Folder Ownership

Platform modules should remain independent from business modules. Shared libraries should never depend on business domains. Infrastructure components should remain reusable across all modules.

---

# 20. Document Status

**Version:** 1.0

**Status:** Architecture Blueprint

**Purpose:** Defines the target project organization that shall be implemented for the NestJS backend.
