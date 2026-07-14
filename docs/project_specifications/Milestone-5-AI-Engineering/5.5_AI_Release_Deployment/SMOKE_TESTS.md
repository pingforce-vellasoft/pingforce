
# SMOKE_TESTS.md

# Enterprise Smoke Testing Strategy

## Purpose

This document defines the smoke testing process for the AI_Engineering platform. Smoke tests provide a rapid validation that a deployment is stable and that critical business functionality is operational before deeper testing or full production traffic.

Applicable Components:
- Angular Admin Portal
- Flutter Android Application
- NestJS Backend APIs
- AI Services
- PostgreSQL Database
- Kubernetes Infrastructure
- Multi-Tenant SaaS Platform
- White-Label Deployments

---

# Objectives

- Detect deployment failures quickly
- Validate critical business workflows
- Confirm platform availability
- Reduce production risk
- Enable fast rollback decisions
- Support automated CI/CD releases

---

# Smoke Test Principles

- Fast execution (target <15 minutes)
- Automated wherever possible
- Environment independent
- Repeatable
- Idempotent
- Production-safe
- Minimal test data

---

# Execution Points

- After every deployment to Development
- After QA deployment
- Before UAT sign-off
- Immediately after Production deployment
- After infrastructure changes
- After database migrations
- After emergency hotfixes

---

# Entry Criteria

- Deployment completed successfully
- Services are running
- Database migration completed
- Feature flags loaded
- Monitoring enabled
- No blocking deployment errors

---

# Exit Criteria

- All critical smoke tests pass
- No Sev-1/Sev-2 defects
- APIs healthy
- Authentication working
- Monitoring shows healthy services

---

# Test Scope

## Infrastructure

- Kubernetes cluster healthy
- Pods Ready
- Load balancer responding
- TLS certificates valid
- Secrets mounted
- ConfigMaps loaded

## Backend APIs

- Health endpoint returns 200
- Authentication API
- Authorization/RBAC
- User profile
- Tenant resolution
- Core CRUD endpoint
- Queue processing
- Notification service

## Database

- Connectivity
- Current schema version
- Read/write validation
- Audit logging
- Index availability

## Admin Portal

- Login
- Dashboard
- Navigation
- Dynamic menus
- Role-based visibility
- Search
- Reports

## Android Application

- Launch
- Login
- Offline storage
- Sync
- Attendance
- GPS permission
- Push notification registration
- Logout

## AI Services

- Health endpoint
- Prompt loading
- Model availability
- Inference request
- Safety filter
- Latency within SLA

## Multi-Tenant

- Tenant login
- Tenant isolation
- Branding
- Licensed modules
- Feature flags
- Regional settings

---

# Critical Business Flows

1. User Login
2. Tenant Resolution
3. RBAC Validation
4. Attendance Check-In
5. Attendance Check-Out
6. Lead Creation
7. Fault Creation
8. Workflow Transition
9. Notification Delivery
10. Report Generation

---

# Automation Strategy

Automate using CI/CD:

- API smoke suite
- UI smoke suite
- Android smoke suite
- Infrastructure validation
- Database validation
- AI inference validation

Smoke tests must execute automatically after every deployment.

---

# Test Data

Use dedicated smoke accounts:

- Super Admin
- Employer
- Manager
- Employee
- Demo Tenant

Data must be reset after execution where required.

---

# Failure Handling

If any critical smoke test fails:

1. Stop rollout
2. Alert Release Manager
3. Capture logs
4. Open incident
5. Evaluate rollback
6. Execute rollback if required
7. Document root cause

---

# Reporting

Capture:

- Environment
- Build Version
- Release Version
- Execution Time
- Passed
- Failed
- Blocked
- Screenshots
- Logs
- Artifact Links

---

# KPIs

- Smoke Test Pass Rate
- Execution Duration
- Production Escape Rate
- Rollback Frequency
- Mean Time to Detect
- Deployment Success Rate

---

# Roles

| Role | Responsibility |
|------|----------------|
| QA | Execute/maintain smoke suite |
| DevOps | Trigger automation |
| Engineering | Resolve failures |
| Release Manager | Go/No-Go decision |
| Product Owner | Business validation |

---

# Best Practices

- Keep suite under 15 minutes
- Cover only critical paths
- Avoid flaky tests
- Run in parallel where possible
- Use production-like environments
- Maintain deterministic test data
- Review suite every release

---

# Related Documents

- README.md
- RELEASE_STRATEGY.md
- CI_CD_RELEASE.md
- DEPLOYMENT_PIPELINE.md
- PRE_RELEASE_CHECKLIST.md
- POST_RELEASE_CHECKLIST.md
- ROLLBACK_STRATEGY.md
- QA_TEST_STRATEGY.md
- SECURITY.md
