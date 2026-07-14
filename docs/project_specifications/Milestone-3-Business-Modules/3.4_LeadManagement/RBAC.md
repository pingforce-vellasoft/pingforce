# Lead Management Module

# RBAC.md

## Document Information

  Item       Value
  ---------- ------------------------------------------------
  Module     Lead Management
  Document   Role-Based Access Control (RBAC) Specification
  Platform   Enterprise Workforce Management SaaS
  Version    1.0
  Status     Production Ready

------------------------------------------------------------------------

# 1. Purpose

This document defines the Role-Based Access Control (RBAC) model for the
Lead Management module. It provides secure, configurable, multi-tenant
authorization across Web, Mobile, APIs and Admin Portal using Roles,
Permission Groups, Permissions, Actions and Data Scope.

------------------------------------------------------------------------

# 2. RBAC Architecture

Authentication → Tenant Resolution → User → Roles → Permission Groups →
Permissions → Actions → Data Scope → Resource Access → Audit Logging

------------------------------------------------------------------------

# 3. Supported Roles

## Super Admin

Platform-wide administration.

## Client Administrator

Tenant administration.

## Employer

Business oversight.

## Sales Manager

Team management.

## Sales Executive / Field Staff

Own lead management.

## Marketing User

Campaign and lead source management.

## Auditor (Read Only)

Compliance and reporting.

------------------------------------------------------------------------

# 4. Permission Groups

-   Dashboard
-   Leads
-   Lead Capture
-   Assignment
-   Sales Pipeline
-   Follow-ups
-   Quotations
-   Customer Conversion
-   Duplicate Management
-   Reports
-   Dashboards
-   Master Data
-   Settings
-   Notifications
-   Documents
-   Audit Logs
-   APIs

------------------------------------------------------------------------

# 5. Standard Actions

-   View
-   Create
-   Update
-   Delete
-   Approve
-   Reject
-   Assign
-   Reassign
-   Convert
-   Import
-   Export
-   Archive
-   Restore
-   Configure
-   Execute
-   Publish

------------------------------------------------------------------------

# 6. Data Scope

Supported scopes: - Own Records - Team - Department - Branch - Region -
Tenant - Global

Row-level security must enforce these scopes.

------------------------------------------------------------------------

# 7. Module Permissions

## Lead Management

-   View Leads
-   Create Lead
-   Edit Lead
-   Delete Lead
-   Import Leads
-   Export Leads
-   Merge Leads
-   Archive Leads

## Assignment

-   Assign
-   Reassign
-   Configure Rules

## Pipeline

-   View Pipeline
-   Move Stage
-   Configure Pipeline

## Follow-up

-   Schedule
-   Complete
-   Escalate
-   Reassign

## Quotations

-   Create
-   Edit
-   Approve
-   Send
-   Convert

## Customer Conversion

-   Convert Lead
-   Approve Conversion
-   Override Duplicate

## Reports

-   View
-   Export
-   Schedule

## Settings

-   View
-   Update
-   Publish

------------------------------------------------------------------------

# 8. Role Matrix

  --------------------------------------------------------------------------------
  Capability   Super Admin Client Admin  Employer   Manager   Executive   Auditor
  ------------ ----------- ------------ ---------- --------- ----------- ---------
  View Leads        ✓           ✓           ✓          ✓         Own         ✓

  Create Leads      ✓           ✓           ✓          ✓          ✓          ✗

  Assign Leads      ✓           ✓           ✓          ✓          ✗          ✗

  Approve           ✓           ✓           ✓          ✓          ✗          ✗
  Quotations                                                             

  Convert           ✓           ✓           ✓          ✓      Optional       ✗
  Customer                                                               

  Configure         ✓           ✓           ✗          ✗          ✗          ✗
  Settings                                                               

  View Audit        ✓           ✓           ✓       Limited       ✗          ✓
  Logs                                                                   
  --------------------------------------------------------------------------------

------------------------------------------------------------------------

# 9. API Authorization

Every API validates: - JWT Token - Tenant - Role - Permission - Action -
Data Scope

------------------------------------------------------------------------

# 10. Mobile Authorization

Menus, widgets, actions and offline synchronization are dynamically
controlled by RBAC and Feature Flags.

------------------------------------------------------------------------

# 11. Audit Requirements

Audit: - Login - Permission denied - Role changes - Permission changes -
Sensitive operations - Configuration changes

Capture: - User - Role - Tenant - Timestamp - Device - IP - Action

------------------------------------------------------------------------

# 12. Security

-   Multi-Tenant Isolation
-   Row-Level Security
-   Principle of Least Privilege
-   MFA Support
-   Session Management
-   Token Rotation
-   Device Validation

------------------------------------------------------------------------

# 13. Database Tables

-   roles
-   permissions
-   permission_groups
-   role_permissions
-   user_roles
-   data_scopes
-   menu_permissions
-   api_permissions
-   audit_log

------------------------------------------------------------------------

# 14. Future Enhancements

-   Attribute-Based Access Control (ABAC)
-   Temporary Permissions
-   Delegated Administration
-   Context-Aware Policies
-   AI Permission Recommendations

------------------------------------------------------------------------

# 15. Acceptance Criteria

-   RBAC enforced across all modules
-   Dynamic menus supported
-   API authorization validated
-   Row-level security operational
-   Tenant isolation maintained
-   Audit trail complete
-   Production ready
