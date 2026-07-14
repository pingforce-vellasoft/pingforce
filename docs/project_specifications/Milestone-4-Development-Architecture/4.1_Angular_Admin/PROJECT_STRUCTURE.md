# PROJECT_STRUCTURE.md

# Angular Admin Project Structure

## Purpose

This document defines the recommended folder and project structure for the Angular Admin Portal. The goal is to maintain a scalable, feature-based architecture that supports multi-tenancy, RBAC, white-labeling, and future business modules.

---

# Design Principles

- Feature-first organization
- Standalone Angular components
- Clear separation of concerns
- Shared reusable components
- Lazy-loaded features
- Scalable enterprise architecture
- Minimal coupling
- Maximum reusability

---

# Root Structure

```text
Angular_Admin/
├── src/
├── public/
├── docs/
├── environments/
├── scripts/
├── .vscode/
├── angular.json
├── package.json
├── tsconfig.json
├── eslint.config.js
└── README.md
```

---

# Source Structure

```text
src/
├── app/
├── assets/
├── styles/
├── environments/
├── favicon.ico
├── index.html
└── main.ts
```

---

# App Structure

```text
app/
├── core/
├── shared/
├── layout/
├── features/
├── models/
├── services/
├── guards/
├── interceptors/
├── state/
├── constants/
├── utils/
├── config/
├── routing/
└── app.config.ts
```

---

# Core Module

Responsible for application-wide services.

```text
core/
├── authentication/
├── authorization/
├── http/
├── interceptors/
├── guards/
├── error-handler/
├── storage/
├── logger/
└── startup/
```

Responsibilities:

- Authentication
- JWT handling
- Refresh token
- Route guards
- Global error handling
- Application initialization

---

# Shared Module

Reusable resources.

```text
shared/
├── components/
├── directives/
├── pipes/
├── validators/
├── dialogs/
├── tables/
├── forms/
├── icons/
└── enums/
```

Contains reusable UI and utilities shared across features.

---

# Layout

```text
layout/
├── login/
├── shell/
├── header/
├── sidebar/
├── footer/
├── breadcrumb/
└── unauthorized/
```

Provides the common application shell.

---

# Feature Modules

```text
features/
├── dashboard/
├── users/
├── roles/
├── permissions/
├── attendance/
├── gps/
├── faults/
├── leads/
├── notifications/
├── reports/
├── organization/
├── settings/
├── documents/
├── assets/
├── subscriptions/
└── profile/
```

Each feature is independently developed and lazy loaded.

---

# Standard Feature Structure

```text
feature-name/
├── pages/
├── components/
├── services/
├── models/
├── routes/
├── store/
├── dialogs/
└── feature.config.ts
```

---

# State Management

```text
state/
├── auth/
├── tenant/
├── user/
├── dashboard/
├── settings/
└── shared/
```

Recommended to use Angular Signals / Signal Store.

---

# Services

```text
services/
├── api/
├── attendance/
├── gps/
├── fault/
├── lead/
├── notification/
├── report/
└── settings/
```

All backend communication should be centralized.

---

# Models

```text
models/
├── auth/
├── user/
├── tenant/
├── attendance/
├── gps/
├── fault/
├── lead/
├── report/
└── common/
```

Keep interfaces and DTOs grouped by domain.

---

# Guards

```text
guards/
├── auth.guard.ts
├── role.guard.ts
├── permission.guard.ts
├── tenant.guard.ts
└── feature.guard.ts
```

---

# Interceptors

```text
interceptors/
├── auth.interceptor.ts
├── loading.interceptor.ts
├── error.interceptor.ts
├── tenant.interceptor.ts
└── logging.interceptor.ts
```

---

# Assets

```text
assets/
├── images/
├── logos/
├── icons/
├── themes/
├── translations/
└── fonts/
```

---

# Configuration

```text
config/
├── application.config.ts
├── menu.config.ts
├── routes.config.ts
├── theme.config.ts
└── feature.config.ts
```

---

# Routing

- Feature-based routes
- Lazy loading
- Route guards
- Dynamic menus
- Permission validation

---

# Coding Guidelines

- One responsibility per component
- Reusable shared components
- Strong typing
- Feature isolation
- Avoid circular dependencies
- Follow Angular style guide

---

# Naming Conventions

- kebab-case folders
- PascalCase classes
- camelCase variables
- \*.service.ts
- \*.component.ts
- \*.guard.ts
- \*.interceptor.ts
- \*.model.ts

---

# Scalability

The structure supports adding new modules such as:

- HRMS
- Payroll
- CRM
- Inventory
- Procurement
- Customer Portal
- Analytics

without restructuring the project.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- CODING_STANDARDS.md
- API_SPEC.md
- RBAC.md
- MULTI_TENANCY.md

---

# Version

Version: 1.0

Status: Approved for Implementation
