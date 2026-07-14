# KPI_LIBRARY.md

# Reports & Analytics - KPI Library

## Document Information

  Field      Value
  ---------- ---------------------------------------------------
  Module     Reports & Analytics
  Platform   Enterprise Multi-Tenant Workforce Management SaaS
  Version    2.0
  Status     Production Ready

------------------------------------------------------------------------

# 1. Purpose

The KPI Library defines the standard Key Performance Indicators (KPIs)
used throughout the platform. KPIs are calculated consistently across
tenants while respecting RBAC, tenant isolation, feature flags, and
enabled modules.

------------------------------------------------------------------------

# 2. KPI Design Principles

-   Real-time where possible
-   Historical trend support
-   Tenant-aware calculations
-   Time-zone aware
-   Configurable thresholds
-   Drill-down enabled
-   Exportable
-   Role-based visibility

------------------------------------------------------------------------

# 3. Common KPI Attributes

Each KPI includes:

-   KPI ID
-   Name
-   Description
-   Category
-   Formula
-   Unit
-   Frequency (Real-time, Hourly, Daily, Monthly)
-   Data Source
-   Thresholds (Good/Warning/Critical)
-   Owner Module
-   Drill-down Target

------------------------------------------------------------------------

# 4. Attendance KPIs

  KPI                 Formula
  ------------------- -----------------------------------------------
  Attendance %        Present Employees / Scheduled Employees × 100
  Present Today       Total checked-in employees
  Absent Today        Scheduled - Present
  Late Arrival %      Late Check-ins / Present × 100
  Early Checkout %    Early Check-outs / Present × 100
  Overtime Hours      Sum of approved overtime
  Leave Utilization   Approved Leave / Available Leave
  Shift Compliance    Compliant Shifts / Total Shifts

------------------------------------------------------------------------

# 5. GPS & Field Operations KPIs

-   Active Field Employees
-   Distance Travelled
-   Route Compliance %
-   Visit Completion %
-   Average Travel Time
-   Idle Time
-   Geofence Violations
-   GPS Disabled Incidents
-   On-Time Visits

------------------------------------------------------------------------

# 6. Fault Management KPIs

-   Open Fault Count
-   Closed Fault Count
-   Average Resolution Time
-   SLA Compliance %
-   SLA Breach Count
-   First-Time Fix Rate
-   Repeat Fault Rate
-   Customer Satisfaction Score
-   Technician Productivity

------------------------------------------------------------------------

# 7. Lead Management KPIs

-   New Leads
-   Qualified Leads
-   Converted Leads
-   Conversion %
-   Lost Leads
-   Average Response Time
-   Follow-up Compliance
-   Campaign Performance
-   Revenue Pipeline

------------------------------------------------------------------------

# 8. Workforce Productivity KPIs

-   Tasks Completed
-   Tasks Pending
-   Productivity Index
-   Average Completion Time
-   Employee Utilization
-   Team Efficiency
-   Manager Performance Score

------------------------------------------------------------------------

# 9. Security KPIs

-   Successful Logins
-   Failed Logins
-   Active Sessions
-   Locked Accounts
-   MFA Adoption
-   Device Registrations
-   Suspicious Login Events
-   Password Reset Requests

------------------------------------------------------------------------

# 10. Platform KPIs

-   Active Tenants
-   Active Users
-   Monthly Active Users
-   Daily Active Users
-   API Requests
-   API Error Rate
-   Storage Utilization
-   Feature Adoption
-   License Usage
-   Subscription Renewals

------------------------------------------------------------------------

# 11. Executive KPIs

-   Overall Productivity Index
-   Organization Health Score
-   Operational Efficiency
-   Employee Engagement
-   Business Growth
-   Compliance Score
-   Customer Satisfaction
-   Executive Risk Score

------------------------------------------------------------------------

# 12. Dashboard Mapping

Executive Dashboard - Organization Health - Productivity - SLA - Revenue
Pipeline

Manager Dashboard - Team Attendance - Productivity - Faults - Leads -
Pending Approvals

Employee Dashboard - Attendance - Assigned Tasks - Visits - Performance

Super Admin Dashboard - Tenant Growth - Platform Usage - License
Consumption - System Health

------------------------------------------------------------------------

# 13. Threshold Configuration

Each KPI supports:

-   Green Threshold
-   Amber Threshold
-   Red Threshold
-   Target Value
-   Alert Trigger
-   Notification Rule

Thresholds are configurable per tenant.

------------------------------------------------------------------------

# 14. Calculation Engine

Supports:

-   Real-time computation
-   Scheduled aggregation
-   Historical snapshots
-   Cached metrics
-   Time-window analysis
-   Cross-module aggregation

------------------------------------------------------------------------

# 15. Drill-down

Every KPI supports navigation to:

Dashboard → Summary Report → Detailed Report → Transaction List → Record
Details

------------------------------------------------------------------------

# 16. Governance

KPIs are:

-   Version controlled
-   Audited
-   Tenant configurable
-   Module aware
-   Feature flag aware
-   RBAC protected

------------------------------------------------------------------------

# 17. Future Roadmap

-   AI-generated KPIs
-   Predictive KPIs
-   Forecast Accuracy
-   Benchmarking
-   Industry Comparisons
-   Natural Language KPI Search
-   ML-based anomaly detection

------------------------------------------------------------------------

## Technology

Frontend - Angular - Flutter

Backend - NestJS

Infrastructure - PostgreSQL - Redis - Background Job Engine - Reporting
Service

------------------------------------------------------------------------

## Status

**Document Status:** Approved

**Implementation Readiness:** Production Ready
