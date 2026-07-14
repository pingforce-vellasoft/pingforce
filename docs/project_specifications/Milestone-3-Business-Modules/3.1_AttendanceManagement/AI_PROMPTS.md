# AI_PROMPTS.md

# Attendance Module - AI Prompt Library

**Module:** Attendance
**Component:** AI Prompt Engineering
**Platform:** Enterprise Workforce Management SaaS Platform
**Version:** 1.0
**Status:** Production Ready

---

# 1. Purpose

This document contains reusable AI prompts for development, testing, documentation, analytics, customer support, and operations related to the Attendance module.

The prompts are intended for use with LLMs during engineering, QA, implementation, and tenant onboarding.

---

# 2. Prompt Categories

- Requirements
- Architecture
- Backend
- Flutter Mobile
- Angular Admin Portal
- Database
- API
- QA
- Security
- Analytics
- Documentation
- Support
- DevOps

---

# 3. Business Analysis Prompt

## BA-001

Objective:
Generate detailed business requirements.

Prompt:

"You are a Senior Business Analyst. Produce enterprise-grade business requirements for an Attendance Management module supporting multi-tenant SaaS, configurable attendance policies, GPS, geofencing, biometric verification, offline synchronization, shift management, attendance correction workflows, reporting, RBAC, notifications, audit logging, payroll integration, and white-label deployment. Include actors, goals, business rules, workflows, assumptions, dependencies, KPIs, risks, and acceptance criteria."

---

# 4. Functional Specification Prompt

## FS-001

Prompt:

"Generate a detailed functional specification for every attendance feature including check-in, check-out, break management, GPS validation, shift validation, offline synchronization, correction workflow, notifications, reporting, dashboards, settings, master data, validations, APIs, and integrations."

---

# 5. Flutter Development Prompt

## FL-001

Prompt:

"Act as a Flutter Enterprise Architect. Generate Clean Architecture code using Riverpod, GoRouter, Dio, Drift/SQLite, Hive, Secure Storage, offline synchronization, repository pattern, use cases, immutable models, localization, accessibility, and enterprise coding standards."

---

# 6. Angular Development Prompt

## NG-001

Prompt:

"Generate Angular 21 standalone components for the Attendance Admin Portal using Signals, RxJS, Angular Material, lazy loading, route guards, RBAC-aware navigation, reactive forms, accessibility, responsive layouts, and enterprise UI standards."

---

# 7. NestJS Backend Prompt

## BE-001

Prompt:

"Generate NestJS modules, controllers, services, repositories, DTOs, Prisma integration, validation pipes, JWT authentication, RBAC guards, audit logging, event publishing, and OpenAPI documentation for the Attendance module."

---

# 8. Database Prompt

## DB-001

Prompt:

"Design a PostgreSQL database with Prisma schema for Attendance including attendance, attendance_sessions, shifts, shift_assignments, attendance_corrections, geofences, gps_validation_logs, offline_queue, audit_logs, indexes, partitions, foreign keys, and multi-tenant isolation."

---

# 9. API Prompt

## API-001

Prompt:

"Generate REST APIs with OpenAPI 3.1 documentation for attendance check-in, check-out, corrections, GPS validation, shifts, reports, settings, offline synchronization, dashboards, and notifications. Include request/response models, validation rules, status codes, pagination, filtering, and RBAC."

---

# 10. Test Generation Prompt

## QA-001

Prompt:

"Generate comprehensive QA test cases covering functional, integration, API, UI, regression, performance, security, accessibility, offline synchronization, GPS validation, RBAC, multi-tenant isolation, and edge cases."

---

# 11. Security Prompt

## SEC-001

Prompt:

"Review the Attendance module against OWASP Top 10. Identify security risks involving JWT, RBAC, GPS spoofing, API abuse, SQL injection, XSS, CSRF, insecure storage, offline data, and recommend mitigation strategies."

---

# 12. Documentation Prompt

## DOC-001

Prompt:

"Generate production-ready Markdown documentation including architecture, workflows, database, APIs, RBAC, reports, dashboards, settings, validation rules, notifications, and implementation guides with enterprise formatting."

---

# 13. Analytics Prompt

## ANA-001

Prompt:

"Generate executive analytics for attendance including KPIs, absenteeism trends, overtime, productivity, GPS compliance, shift utilization, attendance accuracy, department comparisons, forecasting, and actionable insights."

---

# 14. Notification Prompt

## NOT-001

Prompt:

"Generate notification templates for Push, Email, WhatsApp, SMS, and In-App covering attendance events, corrections, shifts, GPS alerts, offline synchronization, and policy violations."

---

# 15. DevOps Prompt

## DEVOPS-001

Prompt:

"Generate CI/CD pipelines using GitHub Actions for Angular, Flutter, NestJS, PostgreSQL migrations, automated testing, security scanning, Docker builds, deployment, and release automation."

---

# 16. AI Code Review Prompt

## REVIEW-001

Prompt:

"Review the Attendance module source code for architecture, SOLID principles, security, performance, accessibility, maintainability, scalability, testability, and enterprise best practices. Suggest concrete improvements."

---

# 17. Migration Prompt

## MIG-001

Prompt:

"Generate a zero-downtime migration strategy for Attendance database schema updates including Prisma migrations, rollback plans, data validation, and deployment sequencing."

---

# 18. Tenant Onboarding Prompt

## TENANT-001

Prompt:

"Generate a tenant onboarding checklist including attendance settings, shifts, holidays, geofences, GPS policies, branding, feature flags, users, RBAC, notifications, and validation."

---

# 19. AI Assistant Prompt

## COPILOT-001

Prompt:

"You are the Attendance Module AI Assistant. Answer administrator and employee questions using configured attendance policies, workflows, reports, dashboards, and audit history. Never expose unauthorized tenant or user data."

---

# 20. Prompt Engineering Guidelines

- Use tenant-specific context.
- Respect RBAC and data scope.
- Do not fabricate attendance records.
- Cite configured business rules where applicable.
- Prefer deterministic output for operational tasks.
- Return structured JSON when requested.
- Preserve auditability in generated workflows.

---

# 21. Future Prompt Library

- AI attendance anomaly detection
- Predictive absenteeism
- Workforce forecasting
- Shift optimization
- Payroll reconciliation
- Natural language report generation
- Intelligent policy recommendations
- Conversational analytics

---

End of AI Prompt Library
