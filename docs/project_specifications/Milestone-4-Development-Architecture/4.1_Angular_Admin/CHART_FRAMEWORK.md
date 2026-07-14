# CHART_FRAMEWORK.md

# Angular Admin - Chart Framework

## Purpose

This document defines the standard chart framework for the Angular Admin Portal. Charts provide business insights through reusable visual components that display KPIs, trends, comparisons, and operational metrics across all modules.

---

# Objectives

- Standardized chart implementation
- Reusable chart components
- Theme-aware visualizations
- Role-based visibility
- Responsive dashboards
- High-performance rendering
- Consistent user experience

---

# Design Principles

- Reusable shared components
- Configuration-driven charts
- Backend-powered data
- Responsive layouts
- Lazy loading
- Minimal business logic
- Accessibility support

---

# Framework Architecture

```text
Dashboard / Feature Page
        │
Chart Component
        │
Chart Configuration
        │
Feature Service
        │
API Layer
        │
Backend
```

---

# Folder Structure

```text
shared/charts/
├── line-chart/
├── bar-chart/
├── pie-chart/
├── donut-chart/
├── area-chart/
├── gauge-chart/
├── heatmap/
├── timeline-chart/
├── chart-card/
├── models/
├── services/
└── chart.config.ts
```

---

# Supported Chart Types

## KPI Charts
- KPI Cards
- Progress Indicators
- Gauges

## Trend Charts
- Line Chart
- Area Chart
- Spline Chart

## Comparison Charts
- Vertical Bar Chart
- Horizontal Bar Chart
- Stacked Bar Chart

## Distribution Charts
- Pie Chart
- Donut Chart

## Timeline Charts
- Attendance Timeline
- GPS Movement Timeline
- Fault Resolution Timeline
- Lead Progress Timeline

---

# Business Usage

## Attendance
- Daily Attendance
- Monthly Attendance
- Late Arrivals
- Overtime

## GPS
- Active Employees
- Travel Distance
- Visit Count
- Geofence Compliance

## Fault Management
- Open vs Closed Faults
- SLA Performance
- Resolution Time
- Technician Performance

## Lead Management
- Pipeline Status
- Lead Sources
- Conversion Rate
- Sales Funnel

## Reports
- Productivity
- Department Comparison
- Monthly Trends
- Executive KPIs

---

# Chart Configuration

Each chart should define:

- Title
- Description
- Chart Type
- Data Source
- Refresh Interval
- Legend
- Tooltip
- Permission Code

---

# Data Source

Charts should consume data from REST APIs.

Support:

- Live Data
- Aggregated Data
- Historical Data

Frontend should only transform data for presentation.

---

# Dashboard Integration

Charts are reusable dashboard widgets.

Each widget supports:

- Drag & Drop Position (future)
- Refresh
- Full Screen
- Export
- Drill Down

---

# Theme Integration

Charts inherit:

- Brand Colors
- Typography
- Background
- Grid Styles
- Tooltip Styles
- Legend Styles

from the Theme Engine.

---

# RBAC Integration

Visibility depends on:

- User Role
- Permission
- Tenant License
- Feature Flag

Users should only view authorized business metrics.

---

# Export

Supported exports:

- PNG
- PDF
- Excel (underlying data)
- CSV (underlying data)

---

# Loading States

Use:

- Skeleton Loader
- Loading Spinner
- Empty State
- Error State

---

# Responsive Behaviour

Desktop:
- Multi-chart dashboard

Tablet:
- Two-column charts

Mobile:
- Single-column stacked charts

---

# Performance Guidelines

- Lazy load chart libraries
- Load visible charts first
- Cache aggregated data
- Refresh only affected widgets
- Avoid unnecessary redraws

---

# Accessibility

Support:

- Keyboard Navigation
- Screen Reader Labels
- High Contrast Themes
- Accessible Legends
- WCAG Color Contrast

---

# Best Practices

- Keep chart configuration metadata-driven.
- Reuse shared chart components.
- Use backend aggregation for large datasets.
- Keep charts simple and readable.
- Use consistent colors and legends.
- Avoid overcrowded visualizations.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- DASHBOARD_FRAMEWORK.md
- UI_COMPONENT_LIBRARY.md
- THEME_ENGINE.md
- API_LAYER.md
- RBAC.md

---

# Version

Version: 1.0

Status: Approved for Implementation
