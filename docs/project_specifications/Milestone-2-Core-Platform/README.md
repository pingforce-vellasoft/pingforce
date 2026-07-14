# Core Platform README

# Enterprise Workforce Platform

## Milestone 2 – Core Platform

**Version:** 1.0.0  
**Status:** Architecture Approved – Ready for Detailed Design

---

# Overview

The **Core Platform** is the foundation of the Enterprise Workforce Platform. Every business module—including Attendance, GPS, Fault Management, Lead Management, Reporting, Notifications, and future extensions—depends on the services defined in this milestone.

The Core Platform is designed to provide reusable enterprise capabilities instead of embedding common functionality into individual business modules.

---

# Objectives

The Core Platform aims to:

- Provide secure authentication and authorization.
- Support unlimited tenants from a single deployment.
- Deliver configurable white-label branding.
- Centralize user and identity management.
- Provide configurable workflow capabilities.
- Enable reusable platform services.
- Ensure every module follows common engineering standards.

---

# Core Principles

- Multi-Tenant by Design
- Security by Default
- Configuration over Customization
- API First
- Documentation First
- Clean Architecture
- SOLID Design
- Enterprise Scalability

---

# Included Modules

## 2.1 Authentication

Responsible for identity verification, JWT issuance, refresh tokens, password policies, account lockout, future MFA and SSO support.

Deliverables include:

- Login
- Logout
- Password Reset
- Token Refresh
- Session Management
- Authentication APIs
- Security Policies

---

## 2.2 Role Based Access Control (RBAC)

Provides authorization using Roles → Permissions → Resources → Actions.

Supports:

- Multiple roles per user
- Explicit deny
- Module-level permissions
- Tenant-aware authorization

---

## 2.3 Multi-Tenant Platform

Provides:

- Tenant provisioning
- Tenant isolation
- Tenant lifecycle
- Tenant configuration
- Tenant-aware APIs
- White-label support

Mandatory rule:

Every business record belongs to exactly one tenant.

---

## 2.4 User Management

Supports:

- Employee users
- Field staff
- Managers
- Client users
- Tenant administrators
- Platform administrators

Capabilities:

- CRUD
- Bulk import/export
- Organizational hierarchy
- Department mapping
- Status management

---

## 2.5 White Label Management

Each tenant can independently configure:

- Logo
- Color palette
- Theme
- Login branding
- Domain
- Email templates
- Notification templates
- Feature flags

---

## 2.6 Settings Management

Hierarchical configuration:

- Global
- Tenant
- Department
- User

Supports feature flags and runtime configuration.

---

## 2.7 Security Framework

Enterprise security services:

- JWT
- RBAC
- Audit Logs
- Secrets Management
- Security Policies
- OWASP compliance
- Session Security

---

## 2.8 Notification Engine

Channels:

- In-App
- Push
- Email
- SMS (future)

Features:

- Templates
- Event-driven notifications
- Scheduling
- Retry
- Delivery tracking

---

## 2.9 File Management

Supports:

- Secure uploads
- OCI Object Storage
- Versioning
- Access control
- Virus scanning integration
- Retention policies

---

## 2.10 Master Data Management

Reusable reference data:

- Departments
- Designations
- Regions
- Priorities
- Categories
- Statuses
- Lookup tables

Provides centralized governance.

---

## 2.11 Workflow Engine

Configurable workflow execution.

Capabilities:

- Approval chains
- Multi-level approvals
- SLA timers
- Escalation
- Versioned workflows
- Audit trail

---

# Cross-Module Dependencies

Every Business Module depends on:

- Authentication
- RBAC
- Multi-Tenant
- User Management
- Notifications
- Workflow Engine
- Audit Logs

Business modules must never duplicate platform functionality.

---

# Technology Stack

- Angular 21 (Admin)
- Flutter (Mobile)
- NestJS
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ
- Docker
- Oracle Cloud Infrastructure
- GitHub Actions

---

# Security Standards

Mandatory for every Core Platform module:

- JWT validation
- Tenant isolation
- Permission enforcement
- Audit logging
- Input validation
- HTTPS
- Parameterized database access
- Secret management through OCI Vault

---

# Quality Standards

Every module must include:

- Business Requirements
- Functional Specification
- Architecture
- API Specification
- Database Design
- Security Design
- Test Cases
- Deployment Guidance
- CHANGELOG
- PROJECT_STATE

Completion requires compliance with:

- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- BUSINESS_RULES.md

---

# Deliverables

This milestone delivers the reusable enterprise platform used by all current and future business modules.

It is intentionally technology-agnostic from a business perspective while providing standardized technical implementations for every consuming module.

---

# Related Documents

- PROJECT_VISION.md
- PRD.md
- ROADMAP.md
- TECH_STACK.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- CODING_STANDARDS.md
- BUSINESS_RULES.md
- DEFINITION_OF_DONE.md
