# CUSTOM_REPORTS.md

# Reports & Analytics - Custom Reports Specification

## Document Information

  -----------------------------------------------------------------------
  Field                               Value
  ----------------------------------- -----------------------------------
  Module                              Reports & Analytics

  Submodule                           Custom Reports

  Platform                            Enterprise Multi-Tenant Workforce
                                      Management SaaS

  Version                             2.0

  Status                              Production Ready

  Audience                            Super Admin, Employer, Business
                                      Analysts, Department Managers,
                                      Power Users
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 1. Purpose

The Custom Reports module enables authorized users to build, save,
schedule, execute, and share reports without requiring software
development. It provides a configurable reporting framework capable of
combining data from multiple business modules while enforcing RBAC,
tenant isolation, feature flags, licensing, and row-level security.

------------------------------------------------------------------------

# 2. Business Objectives

-   Enable self-service reporting
-   Reduce dependency on development teams
-   Provide configurable business intelligence
-   Support cross-module reporting
-   Enable reusable report templates
-   Deliver scheduled executive reports
-   Support regulatory and compliance reporting
-   Improve business decision-making

------------------------------------------------------------------------

# 3. Scope

The reporting framework supports data from:

-   Attendance Management
-   GPS Visit Management
-   Fault Management
-   Lead Management / CRM
-   User Management
-   Organization Hierarchy
-   Workflow Engine
-   Notification Engine
-   Audit Engine
-   Security Monitoring
-   Subscription & Licensing
-   Future business modules

------------------------------------------------------------------------

# 4. Core Features

## Report Builder

-   Drag-and-drop designer
-   Dataset selection
-   Field picker
-   Calculated fields
-   Grouping
-   Aggregations
-   Sorting
-   Filtering
-   Conditional formatting
-   Preview mode

## Data Sources

Supports:

-   Single module
-   Multiple modules
-   Joined datasets
-   Materialized reporting views
-   Predefined business datasets
-   API-backed datasets (future)

## Report Templates

Users can:

-   Save templates
-   Clone templates
-   Version templates
-   Publish templates
-   Archive templates
-   Mark favorites

------------------------------------------------------------------------

# 5. Report Types

-   Tabular Reports
-   Summary Reports
-   Matrix Reports
-   Pivot Reports
-   KPI Reports
-   Dashboard Reports
-   Exception Reports
-   Compliance Reports
-   Executive Reports
-   Ad-hoc Reports

------------------------------------------------------------------------

# 6. Supported Fields

Examples include:

-   Employee
-   Customer
-   Department
-   Branch
-   Region
-   Attendance Status
-   GPS Coordinates
-   Fault Status
-   SLA Status
-   Lead Source
-   Campaign
-   User Role
-   Workflow Stage
-   Device
-   Login Status
-   Audit Action
-   Subscription Plan

------------------------------------------------------------------------

# 7. Calculated Fields

Support:

-   Arithmetic expressions
-   Percentage calculations
-   Date differences
-   Working hours
-   SLA duration
-   Conditional formulas
-   String concatenation
-   Custom aliases

------------------------------------------------------------------------

# 8. Filtering

Global filters:

-   Tenant
-   Company
-   Region
-   Branch
-   Department
-   Team
-   Employee
-   Customer
-   Date Range
-   Module
-   Status
-   Priority
-   Workflow Stage
-   Lead Source
-   Role

Advanced filters:

-   AND / OR logic
-   Nested conditions
-   Saved filter sets
-   Relative date filters
-   Dynamic parameters

------------------------------------------------------------------------

# 9. Visualization Options

-   Tables
-   KPI Cards
-   Line Charts
-   Bar Charts
-   Pie Charts
-   Donut Charts
-   Area Charts
-   Heat Maps
-   Geographic Maps
-   Pivot Grids
-   Tree Maps
-   Gauge Charts

------------------------------------------------------------------------

# 10. Scheduling

Schedules:

-   One-time
-   Daily
-   Weekly
-   Monthly
-   Quarterly
-   Yearly
-   Custom Cron

Delivery Channels:

-   Email
-   In-App
-   WhatsApp
-   Secure Download
-   Shared Dashboard

------------------------------------------------------------------------

# 11. Export Options

Formats:

-   Excel (.xlsx)
-   CSV
-   PDF
-   Print

Capabilities:

-   Password protection
-   Tenant branding
-   Digital signature
-   Watermark
-   Large dataset export
-   Async processing
-   Audit logging

------------------------------------------------------------------------

# 12. Sharing & Collaboration

-   Share within tenant
-   Role-based sharing
-   Department sharing
-   Public (tenant) templates
-   Comments
-   Favorites
-   Report ownership
-   Approval workflow for published templates

------------------------------------------------------------------------

# 13. RBAC

Permissions:

-   Create Custom Report
-   Edit Custom Report
-   Execute Report
-   Export Report
-   Schedule Report
-   Publish Template
-   Delete Report
-   Share Report

Data Scope:

-   Self
-   Team
-   Department
-   Branch
-   Region
-   Company
-   Tenant
-   Global (Super Admin)

------------------------------------------------------------------------

# 14. Report Execution Lifecycle

1.  User selects dataset
2.  RBAC validation
3.  Tenant validation
4.  Filter validation
5.  Query optimization
6.  Data retrieval
7.  KPI calculations
8.  Visualization rendering
9.  Export (optional)
10. Audit logging
11. Delivery

------------------------------------------------------------------------

# 15. Performance Requirements

-   Dashboard preview under 3 seconds for cached datasets
-   Async processing for large reports
-   Query optimization
-   Pagination
-   Horizontal scaling
-   Redis caching
-   Background job execution

------------------------------------------------------------------------

# 16. Security & Compliance

-   Multi-tenant isolation
-   Row-level security
-   Field-level masking
-   Audit trail
-   Data encryption
-   Secure download links
-   Time-zone awareness
-   Localization support

------------------------------------------------------------------------

# 17. APIs

Representative endpoints:

-   GET /custom-reports
-   POST /custom-reports
-   PUT /custom-reports/{id}
-   DELETE /custom-reports/{id}
-   POST /custom-reports/{id}/execute
-   POST /custom-reports/{id}/schedule
-   POST /custom-reports/{id}/share
-   GET /custom-reports/templates

------------------------------------------------------------------------

# 18. Future Roadmap

-   AI Report Builder
-   Natural Language Query ("Show attendance by region last month")
-   AI-generated visualizations
-   Predictive analytics
-   Embedded BI
-   Power BI connector
-   Tableau connector
-   External data connectors
-   Machine learning insights
-   Industry benchmark reports

------------------------------------------------------------------------

## Technology Stack

Frontend - Angular Admin Portal - Flutter Mobile Application

Backend - NestJS Reporting APIs - Reporting Engine - Dashboard Engine

Infrastructure - PostgreSQL - Redis - Background Job Engine - Analytics
Service

------------------------------------------------------------------------

## Status

**Document Status:** Approved

**Implementation Readiness:** Production Ready
