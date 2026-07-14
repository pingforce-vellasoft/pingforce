# BRANCHING.md

# Enterprise Git Branching Strategy

## Purpose

This document defines the Git branching model for the AI_Engineering platform. It standardizes collaboration, release management, hotfixes, CI/CD integration, code review, and deployment across the enterprise multi-tenant SaaS platform.

The strategy supports:

- Angular Admin Portal
- Android (Flutter)
- NestJS Backend APIs
- AI Services
- Infrastructure as Code
- Database Migrations
- White-label deployments

---

# Goals

- Predictable releases
- Short-lived feature branches
- Continuous Integration
- Safe production deployments
- Easy rollback
- Clear ownership
- Auditability

---

# Branch Model

```
main
│
├── develop
│   ├── feature/*
│   ├── bugfix/*
│   └── spike/*
│
├── release/*
│
└── hotfix/*
```

---

# Primary Branches

## main

Production-ready code only.

Rules:

- Protected branch
- Pull Requests only
- Required approvals
- CI must pass
- Signed commits preferred
- Tagged for every production release

---

## develop

Integration branch for the next release.

Rules:

- Accepts completed features
- Automated CI validation
- Daily integration
- No direct commits in production workflows

---

# Supporting Branches

## feature/\*

Naming:

```
feature/<module>-<short-description>
```

Examples:

- feature/rbac-engine
- feature/attendance-offline-sync
- feature/feature-flags
- feature/workflow-engine

Rules:

- Created from develop
- One feature per branch
- Rebase frequently
- Squash merge into develop
- Delete after merge

---

## bugfix/\*

Naming:

```
bugfix/<issue-id>-<description>
```

Examples:

- bugfix/API-214-login-timeout
- bugfix/mobile-gps-crash

Created from:

- develop

Merged into:

- develop

---

## hotfix/\*

Purpose:

Emergency production fixes.

Naming:

```
hotfix/<version>-<issue>
```

Examples:

- hotfix/2.4.1-auth-token
- hotfix/2.5.0-security-patch

Flow:

main → hotfix → main → develop

---

## release/\*

Purpose:

Release stabilization.

Naming:

```
release/<major.minor.patch>
```

Example:

release/2.5.0

Allowed changes:

- Bug fixes
- Documentation
- Version updates
- Release notes
- Configuration fixes

No new features.

---

## spike/\*

Used for research and proof-of-concepts.

Never merged directly into production.

---

# Branch Lifecycle

1. Create feature branch from develop
2. Commit frequently
3. Push to remote
4. Open Pull Request
5. CI validation
6. Code review
7. QA validation
8. Merge into develop
9. Delete feature branch

---

# Pull Request Policy

Every PR must include:

- Business summary
- Linked work item
- Test evidence
- Screenshots (UI changes)
- API documentation updates
- Migration notes (if applicable)
- Rollback considerations

Required approvals:

- Module Owner
- Peer Reviewer
- QA (release branches)

---

# Commit Convention

Conventional Commits:

- feat:
- fix:
- docs:
- refactor:
- perf:
- test:
- build:
- ci:
- chore:
- revert:

Examples:

```
feat(rbac): add permission inheritance
fix(auth): resolve refresh token expiry
docs(release): update deployment guide
```

---

# Branch Protection

Protected:

- main
- develop
- release/\*

Policies:

- No force push
- No direct commits
- Required reviews
- Passing CI
- Secret scanning
- Status checks
- Linear history (recommended)

---

# Merge Strategy

| Branch     | Merge Method |
| ---------- | ------------ |
| feature/\* | Squash       |
| bugfix/\*  | Squash       |
| release/\* | Merge Commit |
| hotfix/\*  | Merge Commit |

---

# CI/CD Integration

Every branch triggers appropriate pipelines:

Feature:

- Build
- Lint
- Unit Tests

Develop:

- Integration Tests
- Security Scan
- Package Validation

Release:

- Full Regression
- Performance Tests
- UAT Deployment

Main:

- Signed Build
- Production Deployment
- Git Tag
- Release Notes

---

# Database Branching

Migration files:

```
V001__Initial.sql
V002__RBAC.sql
V003__Workflow.sql
```

Rules:

- Sequential
- Immutable
- Reviewed
- Backward compatible

---

# Multi-Repository Guidance

Recommended repositories:

- frontend-admin
- mobile-app
- backend-api
- ai-services
- infrastructure
- shared-libraries
- documentation

All repositories follow the same branching policy.

---

# Release Flow

```
develop
   │
feature/*
   │
develop
   │
release/2.5.0
   │
main
   │
v2.5.0
```

Emergency:

```
main
  │
hotfix/*
  │
main
  │
develop
```

---

# Best Practices

- Keep branches short-lived
- Merge frequently
- Resolve conflicts early
- Avoid long-running branches
- Rebase before opening PRs
- Keep commits focused
- Delete merged branches
- Automate quality checks

---

# Anti-Patterns

Avoid:

- Direct commits to main
- Massive pull requests
- Mixing unrelated features
- Force pushing protected branches
- Skipping code reviews
- Long-lived feature branches

---

# Success Metrics

Track:

- PR cycle time
- Merge frequency
- Deployment frequency
- Lead time
- Merge conflicts
- Hotfix count
- Change failure rate
- MTTR

---

# Related Documents

- README.md
- RELEASE_STRATEGY.md
- VERSIONING.md
- CHANGELOG.md
- PROJECT_STATE.md
- CI_CD.md
- DEVOPS.md
