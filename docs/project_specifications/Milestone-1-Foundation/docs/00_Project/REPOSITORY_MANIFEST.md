# REPOSITORY_MANIFEST.md

# Enterprise Workforce Platform Repository Manifest

**Version:** 1.0.0
**Status:** Approved
**Repository Type:** Documentation-First Enterprise SaaS

---

# 1. Purpose

This manifest is the authoritative inventory of the Enterprise Workforce Platform repository.

It defines:

- Repository scope
- Directory ownership
- Documentation standards
- Technology boundaries
- Module catalog
- Governance rules
- File organization
- Cross-module dependencies

Every file added to the repository must conform to this manifest.

---

# 2. Repository Objectives

The repository shall:

- Be the single source of truth.
- Support enterprise-scale development.
- Enable AI-assisted engineering.
- Be documentation-first.
- Support multi-tenant SaaS architecture.
- Remain modular and extensible.

---

# 3. Repository Layout

```
/
├── docs/
├── frontend/
├── mobile/
├── backend/
├── database/
├── infrastructure/
├── prompts/
├── scripts/
├── tests/
├── tools/
└── .github/
```

Each top-level folder has a single responsibility.

---

# 4. Documentation Structure

docs/
├── foundation/
├── adr/
├── architecture/
├── api/
├── database/
├── modules/
├── deployment/
├── security/
├── testing/
└── ai-engineering/

Every document must have:
- Title
- Version
- Status
- Purpose
- Scope
- Main content
- References
- Revision history

---

# 5. Module Catalog

Foundation
- Vision
- PRD
- Repository Standards
- Coding Standards
- Definition of Done
- ADRs

Core Platform
- Authentication
- RBAC
- Multi-Tenant
- User Management
- White Label
- Settings
- Notifications
- File Management
- Master Data
- Workflow Engine

Business
- Attendance
- GPS & Visits
- Fault Management
- Lead Management
- Reports
- Business Notifications

Development
- Angular
- Flutter
- NestJS
- PostgreSQL
- DevOps

AI Engineering
- Antigravity
- Stitch MCP
- AI Review
- AI QA
- AI Release

---

# 6. Technology Baseline

Web: Angular 21
Mobile: Flutter
Backend: NestJS
Database: PostgreSQL + Prisma
Cache: Redis
Queue: BullMQ
Cloud: Oracle Cloud Infrastructure
Container: Docker
CI/CD: GitHub Actions

---

# 7. Mandatory Repository Standards

Every module must include:

- README.md
- BUSINESS_REQUIREMENTS.md
- FUNCTIONAL_SPECIFICATION.md
- ARCHITECTURE.md
- API.md (where applicable)
- DATABASE.md (where applicable)
- SECURITY.md
- TEST_CASES.md
- CHANGELOG.md
- PROJECT_STATE.md

No placeholder files are permitted.

---

# 8. Naming Standards

Directories:
lowercase-with-hyphens

Markdown:
UPPER_CASE_WITH_UNDERSCORES.md for standards
Pascal-style ADR names

Source code follows language-specific conventions defined in CODING_STANDARDS.md.

---

# 9. Dependency Rules

Frontend -> Backend APIs

Mobile -> Backend APIs

Backend -> Database

Infrastructure must not depend on business modules.

Business modules may depend on Core Platform only.

---

# 10. Ownership

Architecture Team:
- ADRs
- Standards
- Repository governance

Frontend Team:
- Angular

Mobile Team:
- Flutter

Backend Team:
- NestJS

Platform Team:
- Infrastructure
- CI/CD
- Security

Documentation Team:
- Technical documentation
- Changelog
- Repository standards

---

# 11. Quality Gates

Before merge:

✓ Documentation updated
✓ Tests passing
✓ Security review complete
✓ Architecture compliant
✓ CHANGELOG updated
✓ Definition of Done satisfied

---

# 12. Versioning

Semantic Versioning applies to:
- Repository
- APIs
- Documentation
- Releases

Major architectural changes require a new ADR.

---

# 13. Repository Governance

Changes affecting:
- Folder structure
- Technology stack
- Standards
- Architecture
- Security

must undergo Architecture Review and ADR approval.

---

# 14. Success Criteria

The repository is considered healthy when:

- Standards are followed.
- Documentation is current.
- No duplicate architecture.
- Clear module ownership.
- AI tools can use documentation without ambiguity.
- Developers can implement features using repository guidance alone.

---

# 15. Related Documents

- README.md
- PROJECT_VISION.md
- PROJECT_STATE.md
- CHANGELOG.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This manifest is the authoritative reference for repository organization and governance.
