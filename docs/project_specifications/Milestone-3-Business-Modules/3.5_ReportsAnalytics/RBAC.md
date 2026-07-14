# RBAC.md

# Reports & Analytics - Role-Based Access Control (RBAC) Specification

## Document Information

  Field       Value
  ----------- ---------------------------------------------------
  Module      Reports & Analytics
  Component   RBAC
  Platform    Enterprise Multi-Tenant Workforce Management SaaS
  Version     2.0
  Status      Production Ready

------------------------------------------------------------------------

# 1. Purpose

This document defines the Role-Based Access Control (RBAC) model for the
Reports & Analytics module. It governs access to dashboards, reports,
KPIs, exports, scheduled reports, widgets, templates, analytics, APIs,
and administrative functions while enforcing tenant isolation, row-level
security (RLS), feature licensing, and audit logging.

------------------------------------------------------------------------

# 2. RBAC Architecture

Authorization is evaluated in the following order:

1.  Authentication (JWT)
2.  Tenant Resolution
3.  License Validation
4.  Enabled Module Validation
5.  Feature Flag Validation
6.  Role Assignment
7.  Permission Group Evaluation
8.  Permission Evaluation
9.  Data Scope Validation
10. Row-Level Security
11. Field-Level Security
12. Audit Logging

------------------------------------------------------------------------

# 3. Standard Roles

## Super Admin

-   Cross-tenant visibility
-   Platform-wide administration
-   Global dashboards
-   KPI management
-   Global templates
-   API administration

## Employer Admin

-   Tenant-wide reporting
-   Dashboard administration
-   Export administration
-   Scheduled reports
-   Template management

## Reporting Administrator

-   Create/edit reports
-   Manage dashboards
-   Configure widgets
-   Manage KPIs
-   Publish templates

## Manager

-   Team dashboards
-   Team analytics
-   Scheduled reports
-   Export team data

## Supervisor

-   Operational reports
-   Team KPIs
-   Drill-down reports

## Employee

-   Personal dashboard
-   Personal reports
-   Personal KPIs
-   Personal exports

## Auditor / Compliance

-   Read-only reports
-   Audit logs
-   Compliance dashboards
-   Export audit evidence

------------------------------------------------------------------------

# 4. Permission Groups

-   Dashboard Management
-   Report Management
-   Widget Management
-   KPI Management
-   Template Management
-   Export Management
-   Scheduled Report Management
-   Analytics Administration
-   Dataset Administration
-   API Access
-   Audit Access

------------------------------------------------------------------------

# 5. Permission Matrix

Dashboard - View - Create - Update - Delete - Clone - Publish - Share -
Configure

Reports - View - Execute - Preview - Create - Update - Delete -
Publish - Archive - Share

KPIs - View - Configure - Recalculate - Publish

Exports - Export - Download - Delete - Schedule - View History

Scheduled Reports - Create - Edit - Pause - Resume - Execute - Delete -
View History

Templates - View - Create - Clone - Publish - Archive - Delete

APIs - Read - Execute - Admin

------------------------------------------------------------------------

# 6. Data Scope

Every permission is constrained by one of:

-   Self
-   Team
-   Department
-   Branch
-   Region
-   Company
-   Tenant
-   Global

------------------------------------------------------------------------

# 7. Field-Level Security

Sensitive fields may be masked:

-   Salary
-   Personal Email
-   Mobile Number
-   GPS Coordinates
-   Customer PII
-   API Keys
-   Security Events

Masking rules are configurable per tenant.

------------------------------------------------------------------------

# 8. Row-Level Security

Rows are filtered by:

-   Tenant
-   Company
-   Region
-   Branch
-   Department
-   Team
-   Reporting Hierarchy
-   Ownership
-   Assigned User

------------------------------------------------------------------------

# 9. API Authorization

Every API validates:

-   JWT
-   Tenant
-   Module License
-   Feature Flag
-   Role
-   Permission
-   Data Scope

------------------------------------------------------------------------

# 10. Report Sharing

Supports:

-   User sharing
-   Role sharing
-   Department sharing
-   Tenant-wide sharing
-   Expiring access
-   Read-only links

------------------------------------------------------------------------

# 11. Audit

All privileged actions capture:

-   User
-   Role
-   Permission
-   Tenant
-   Resource
-   Timestamp
-   Device
-   IP Address
-   Before/After Values

------------------------------------------------------------------------

# 12. Security Controls

-   Least privilege
-   Deny by default
-   Session validation
-   MFA compatibility
-   Secure exports
-   Download expiry
-   Immutable audit trail

------------------------------------------------------------------------

# 13. Performance

-   Permission caching
-   Redis authorization cache
-   Token claims optimization
-   Background permission refresh

------------------------------------------------------------------------

# 14. Integration Points

-   Authentication Service
-   Core RBAC Engine
-   Module Engine
-   Feature Flag Engine
-   Reporting Engine
-   Dashboard Engine
-   Export Framework
-   Notification Engine
-   Audit Engine

------------------------------------------------------------------------

# 15. Future Roadmap

-   Attribute-Based Access Control (ABAC)
-   Policy engine integration
-   Context-aware permissions
-   Risk-based authorization
-   AI permission recommendations
-   Fine-grained field policies

------------------------------------------------------------------------

## Technology Stack

Frontend - Angular 21 - Flutter

Backend - NestJS - Prisma ORM

Infrastructure - PostgreSQL - Redis

------------------------------------------------------------------------

## Status

**RBAC Specification:** Approved

**Implementation Readiness:** Production Ready
