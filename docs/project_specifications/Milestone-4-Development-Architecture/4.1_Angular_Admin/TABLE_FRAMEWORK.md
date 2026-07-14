# TABLE_FRAMEWORK.md

# Angular Admin - Table Framework

## Purpose

This document defines the standard table framework for the Angular Admin Portal. Tables are one of the most frequently used UI components across business modules. This framework ensures a consistent, reusable, high-performance implementation for displaying, searching, filtering, and managing tabular data.

---

# Objectives

- Standardize all data tables
- Reusable table components
- Server-side data operations
- Consistent user experience
- Responsive layouts
- Theme-aware styling
- RBAC-aware actions
- Easy extensibility

---

# Design Principles

- Reusable shared component
- Server-side pagination
- Server-side sorting
- Server-side filtering
- Configurable columns
- Responsive design
- Minimal business logic
- Accessible by default

---

# Framework Architecture

```text
Feature Page
      │
Shared Table Component
      │
Table Configuration
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
shared/tables/
├── data-table/
├── column-selector/
├── filter-panel/
├── pagination/
├── toolbar/
├── export/
├── models/
├── services/
└── table.config.ts
```

---

# Core Features

- Pagination
- Sorting
- Global Search
- Column Filters
- Quick Filters
- Column Visibility
- Row Selection
- Bulk Actions
- Export
- Refresh
- Responsive Layout

---

# Standard Table Layout

```text
Toolbar
Search
Quick Filters

------------------------------------------
Data Table
------------------------------------------

Pagination
```

---

# Toolbar

Recommended actions:

- Add
- Edit
- Delete
- Refresh
- Export
- Import
- Filter
- Column Settings

Toolbar actions should respect RBAC permissions.

---

# Columns

Each column should support:

- Header
- Sorting
- Visibility
- Width
- Alignment
- Formatting
- Tooltip

Optional:

- Sticky Columns
- Custom Templates
- Action Buttons

---

# Searching

Support:

- Global Search
- Field Search
- Instant Search (debounced)
- Advanced Search

Searching should be performed server-side for large datasets.

---

# Filtering

Supported filters:

- Text
- Dropdown
- Multi Select
- Date
- Date Range
- Number
- Status
- User
- Department

Filters should be reusable across modules.

---

# Sorting

Support:

- Single Column Sorting
- Ascending
- Descending

Sorting should be handled by the backend.

---

# Pagination

Recommended options:

- 10
- 25
- 50
- 100 rows

Server returns:

- Current Page
- Total Records
- Total Pages

---

# Row Selection

Support:

- Single Selection
- Multiple Selection
- Select All (Current Page)

Used for bulk operations.

---

# Bulk Actions

Examples:

- Delete
- Export
- Assign
- Approve
- Reject
- Update Status

Bulk actions must be permission controlled.

---

# Row Actions

Common actions:

- View
- Edit
- Delete
- Duplicate
- Download
- History

Visibility depends on RBAC permissions.

---

# Export

Supported formats:

- Excel
- CSV
- PDF

Export should honor current filters and permissions.

---

# Empty States

Display appropriate messages for:

- No Data
- No Search Results
- Loading
- Error

---

# Loading States

Use:

- Skeleton Loader
- Progress Indicator
- Table Overlay

Prevent duplicate requests during loading.

---

# Responsive Behaviour

Desktop:

- Full table

Tablet:

- Reduced columns

Mobile:

- Card/List presentation where appropriate

---

# Theme Integration

Tables should inherit:

- Colors
- Typography
- Borders
- Hover States
- Selection Styles

from the Theme Engine.

---

# RBAC Integration

Permissions control:

- Table visibility
- Row actions
- Bulk actions
- Export
- Import

---

# Performance Guidelines

- Server-side pagination
- Server-side filtering
- Virtual scrolling for large datasets
- Debounced search
- Lazy loading
- Avoid unnecessary re-rendering

---

# Accessibility

Support:

- Keyboard Navigation
- Focus Indicators
- Screen Readers
- Accessible Headers
- ARIA Labels

---

# Best Practices

- Reuse the shared table component.
- Keep configuration metadata-driven.
- Avoid feature-specific table implementations.
- Centralize formatting utilities.
- Keep business logic outside the shared component.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- SHARED_LIBRARY.md
- UI_COMPONENT_LIBRARY.md
- FORM_FRAMEWORK.md
- API_LAYER.md
- THEME_ENGINE.md

---

# Version

Version: 1.0

Status: Approved for Implementation
