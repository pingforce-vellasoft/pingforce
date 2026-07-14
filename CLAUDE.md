# CLAUDE.md — PingForce Monorepo

> AI engineering reference for Claude Code. Replaces missing NestJS, Prisma, Angular, NX, Docker, and GitHub Actions skills.

---

## Project Overview

**PingForce** — cloud-native, AI-native, multi-tenant, white-label Workforce Management SaaS.

Target: ISPs, field service orgs, facility management, security agencies, telecom operators.

**Monorepo structure:**
```
apps/
  api/          # NestJS backend (TypeScript)
  admin/        # Angular 21 admin portal (TypeScript)
  mobile/       # Flutter mobile app (Dart)
  api-e2e/      # NestJS E2E tests
prisma/         # Prisma schema + migrations
docs/           # Project specs, ADRs, milestones
.github/
  workflows/    # GitHub Actions CI/CD
```

---

## Tech Stack

| Layer | Tech | Version |
|---|---|---|
| Mobile | Flutter + Riverpod | Stable |
| Admin Web | Angular + Angular Material | 21 |
| Backend | NestJS | LTS |
| Language | TypeScript (backend/admin), Dart (mobile) | strict mode |
| Database | PostgreSQL | 16+ |
| ORM | Prisma | Latest stable |
| Cache | Redis | — |
| Queue | BullMQ | — |
| Auth | JWT + Refresh Tokens | — |
| Storage | OCI Object Storage | — |
| Container | Docker (multi-stage) | — |
| Cloud | Oracle Cloud Infrastructure (OCI) | — |
| CI/CD | GitHub Actions | — |
| Monorepo | NX | — |
| Monitoring | Prometheus + Grafana | — |
| Logging | nestjs-pino (structured JSON) | — |

---

## NestJS (Backend)

### Architecture (strict layer order)
```
Controller → Service → Repository → Prisma
```
- Business logic: Services only. Never in controllers or repositories.
- No raw SQL unless justified in an ADR.
- Every feature = its own NestJS module.
- DTOs with `class-validator` + `class-transformer` on every input.
- `@UseGuards(JwtAuthGuard, RbacGuard)` on protected routes.

### Module structure pattern
```
src/
  feature/
    feature.module.ts
    feature.controller.ts
    feature.service.ts
    feature.repository.ts
    dto/
      create-feature.dto.ts
      update-feature.dto.ts
```

### Key conventions
- API prefix: `/api/v1/...` (URI versioning via `VersioningType.URI`)
- Swagger: auto-generated at `/api/docs`
- Global pipes: `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Global filters: `GlobalExceptionFilter`, `PrismaClientExceptionFilter`
- Global interceptors: `DatabaseRetryInterceptor`
- Security headers: `helmet()`
- CORS origins: from `ALLOWED_ORIGINS` env var (comma-separated)
- Logging: `nestjs-pino` — structured JSON, include `tenant_id`, `user_id`, `request_id`

### Multi-tenancy pattern
Every query MUST scope to `tenantId`. Never query without tenant filter on business tables.

```typescript
// Always pass tenantId from JWT payload
async findAll(tenantId: string) {
  return this.prisma.employee.findMany({
    where: { tenantId, deletedAt: null },
  });
}
```

### RBAC
- Decorator: `@RequirePermission('resource:action')`
- Guard: `RbacGuard` reads permissions from JWT claims
- Never bypass RBAC on business endpoints

### TypeScript rules
- `strict: true` — no `any`
- `readonly` preferred on DTOs
- Explicit return types on all service/repository methods
- `async/await` over promise chains

---

## Prisma (ORM)

### Schema location
`prisma/schema.prisma`

### Mandatory columns on every business model
```prisma
id        String    @id @default(uuid())
tenantId  String
createdAt DateTime  @default(now())
updatedAt DateTime  @updatedAt
createdBy String?
updatedBy String?
deletedAt DateTime?   // soft delete
```

### Indexes required
- `tenantId` on every business table
- Foreign keys
- Frequently searched columns

### Commands
```bash
# Generate client after schema change
npx prisma generate

# Create migration
npx prisma migrate dev --name description

# Deploy migrations (prod)
npx prisma migrate deploy

# Seed
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

### Soft delete
Never hard-delete business records. Always set `deletedAt = now()`. All queries filter `deletedAt: null`.

### Transactions
Multi-table business operations MUST use `prisma.$transaction([...])`.

---

## Angular (Admin Portal)

### Standards
- Angular 21 standalone components — no NgModules
- Signals-first state management (`signal()`, `computed()`, `effect()`)
- RxJS for async streams only
- Lazy-loaded routes
- Smart/Dumb component separation: logic in smart components + services, dumb components are presentational only
- Reactive Forms (not template-driven)
- Route guards: `AuthGuard`, `RoleGuard`
- HTTP Interceptors: `JwtInterceptor`, `ErrorInterceptor`, `LoadingInterceptor`

### File naming
```
employee-list.component.ts
employee.service.ts
employee.model.ts
```

### API calls
Never in components. Always in services.

```typescript
// service
getEmployees(): Observable<Employee[]> {
  return this.http.get<Employee[]>(`${this.api}/employees`);
}
```

### Folder structure
```
src/app/
  core/
    auth/
    guards/
    interceptors/
    services/
  pages/
    feature/
      feature.component.ts
      feature.service.ts
```

---

## Flutter (Mobile)

### Architecture — Clean Architecture per feature
```
lib/
  features/
    feature_name/
      domain/
        entities/
        repositories/       # abstract interfaces
        usecases/
      data/
        datasources/        # remote + local
        models/             # extends entity, has fromJson/toJson
        repositories/       # implements domain repo
      presentation/
        feature_screen.dart
        feature_state.dart
        feature_notifier.dart
        widgets/
  core/
    network/
    theme/
    navigation/
    widgets/
    hardware/
    offline/
    sync/
    tenant/
```

### State management — Riverpod (not BLoC)
- `StateNotifier` + `StateNotifierProvider` for feature state
- `ConsumerWidget` / `ConsumerStatefulWidget` for all screens
- `ProviderScope` at root (`main.dart`)
- No `BlocProvider`, no `BlocBuilder` — legacy BLoC is removed

```dart
// Notifier pattern
class FeatureNotifier extends StateNotifier<FeatureState> {
  FeatureNotifier() : super(const FeatureState.initial());
}

final featureProvider = StateNotifierProvider<FeatureNotifier, FeatureState>(
  (ref) => FeatureNotifier(),
);
```

### Dependency injection
`get_it` service locator. Setup in `lib/injection_container.dart`. Call `di.init()` in `main()`.

### Navigation
`go_router` via `routerProvider`. Routes defined in `lib/core/navigation/app_router.dart`.

### Local storage
- `Hive` + `hive_flutter` for offline cache
- `flutter_secure_storage` for tokens/secrets

### Networking
- `dio` with `TokenInterceptor` for JWT auto-attach + refresh
- All remote calls go through datasource classes only

### Offline-first
`OfflineAwareScaffold` wraps screens needing offline state. `SyncProvider` handles background sync. `ConnectivityProvider` watches network state.

### File naming
```
employee_list_screen.dart
employee_state.dart
employee_notifier.dart
employee_entity.dart
employee_model.dart
employee_repository.dart
employee_repository_impl.dart
```

### Theme
`AppTheme.lightTheme` / `AppTheme.darkTheme` in `lib/core/theme/`. Colors: `AppColors`, Typography: `AppTypography`, Dimensions: `AppDimensions`. White-label: colors come from tenant config.

---

## NX (Monorepo)

### Key commands
```bash
# Run affected tests/lint/build (what CI uses)
npx nx affected -t lint test build

# Run specific app
npx nx serve api
npx nx serve admin
npx nx build mobile   # handled by flutter separately

# Format check
npx nx format:check

# Format write
npx nx format:write

# Show project graph
npx nx graph

# Generate (if NX plugins available)
npx nx g @nx/nest:resource feature-name --project api
```

### CI uses NX affected
Only changed projects are tested/built. `nrwl/nx-set-shas@v4` sets the base SHA for diff.

---

## GitHub Actions (CI/CD)

### Workflows
| File | Trigger | Does |
|---|---|---|
| `.github/workflows/ci.yml` | push/PR to main | NX affected: lint, test, build |
| `.github/workflows/flutter_build.yml` | push/PR touching `apps/mobile/**` | Flutter analyze + APK release build |

### CI pipeline stages (full planned)
1. Install → 2. Lint → 3. Unit Tests → 4. Build → 5. Security Scan → 6. Package → 7. Deploy → 8. Smoke Tests

### Flutter CI specifics
- Java 17 (Zulu) required for Android SDK
- `subosito/flutter-action@v2` stable channel
- APK artifact retained 7 days: `PingForce-Mobile-Release-APK`

---

## Docker + OCI Deployment

### Docker
- Multi-stage builds for production images
- Secrets via OCI Vault — never in Dockerfiles or env files committed to git

### OCI Services in use
- Compute (VM instances)
- Load Balancer
- Virtual Cloud Network (VCN)
- Object Storage (file uploads, documents)
- Vault (secrets)
- Monitoring + Logging

---

## Database (PostgreSQL)

### Naming
- Tables: `snake_case` plural (e.g., `attendance_sessions`)
- All UUIDs for PKs
- All business tables have `tenant_id`

### Migrations
Via Prisma migrations only. No ad-hoc SQL changes to production.

---

## Security (Non-Negotiable)

- HTTPS only
- JWT access token + refresh token rotation
- RBAC enforced at API layer
- Tenant isolation: every query scoped to `tenantId`
- Secrets in OCI Vault only — never in code or `.env` committed to git
- Parameterized queries via Prisma — no string interpolation in SQL
- Audit logging: every mutation logged with `tenant_id`, `user_id`, `request_id`
- OWASP Top 10 compliance required
- No stack traces in API responses

---

## Error Handling

Every error must:
1. Be logged (structured JSON with correlation ID)
2. Include `request_id`
3. Never expose stack traces to clients
4. Return standard response shape

---

## Git Conventions

### Branch naming
```
feature/short-description
bugfix/short-description
hotfix/short-description
release/v1.x.x
```

### Commits — Conventional Commits
```
feat: add GPS validation to attendance check-in
fix: correct token expiry check in JWT guard
docs: update attendance module README
refactor: extract tenant resolver to middleware
test: add unit tests for leave service
```

---

## AI-Generated Code Rules

All AI output (including from Claude) MUST pass:
1. Architecture review (correct layer placement)
2. Security review (tenant isolation, RBAC, no secrets)
3. Performance review (no N+1, pagination, caching)
4. QA review (tests written)

No AI output merges without human approval.

---

## Anti-Patterns (Forbidden)

- `any` type in TypeScript
- Business logic in Angular components or NestJS controllers
- Business logic in Flutter widgets
- API calls directly in Flutter widgets or Angular components
- Raw SQL strings in NestJS (use Prisma)
- Hard-coded secrets or credentials anywhere
- Queries without `tenantId` filter on business tables
- Hard-delete on business records (use `deletedAt`)
- BLoC in Flutter (migrated to Riverpod — don't re-introduce)
- N+1 queries (use Prisma `include` or batch)
- Missing DTO validation on NestJS endpoints
- God classes or circular dependencies

---

## Definition of Done

Feature is complete only when:
- [ ] Code implemented in correct layer
- [ ] Tenant isolation enforced
- [ ] DTO validation present
- [ ] Tests passing (90%+ business logic coverage)
- [ ] Documentation updated
- [ ] Security reviewed
- [ ] CI/CD green
- [ ] No Sonar issues
- [ ] Product Owner approved
