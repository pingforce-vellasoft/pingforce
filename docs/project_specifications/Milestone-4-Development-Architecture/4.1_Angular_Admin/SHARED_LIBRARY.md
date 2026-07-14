# SHARED_LIBRARY.md

# Angular Admin - Shared Library

## Purpose

The Shared Library contains reusable UI components, directives, pipes, utilities, models, and helper services used across all feature modules. It eliminates code duplication and ensures a consistent user experience throughout the Angular Admin Portal.

---

# Objectives

- Promote code reusability
- Maintain UI consistency
- Reduce duplicate implementations
- Centralize common utilities
- Improve maintainability
- Support enterprise scalability

---

# Shared Library Structure

```text
shared/
├── components/
├── directives/
├── pipes/
├── forms/
├── dialogs/
├── tables/
├── cards/
├── charts/
├── loaders/
├── layout/
├── validators/
├── services/
├── models/
├── enums/
├── constants/
├── utils/
├── icons/
├── themes/
└── index.ts
```

---

# Reusable Components

## Layout Components

- Header
- Sidebar
- Footer
- Breadcrumb
- Page Title
- Toolbar

## Form Components

- Text Box
- Password Field
- Number Input
- Email Input
- Date Picker
- Date Range Picker
- Time Picker
- Dropdown
- Multi Select
- Auto Complete
- Checkbox
- Radio Button
- Toggle Switch
- File Upload
- Image Upload
- Signature Pad
- Rich Text Editor

## Table Components

- Data Table
- Server-side Table
- Pagination
- Sorting
- Column Selector
- Export Actions
- Search Toolbar
- Filter Panel

## Card Components

- Summary Card
- KPI Card
- Statistics Card
- User Card
- Profile Card
- Status Card

## Dialog Components

- Confirmation Dialog
- Delete Confirmation
- Success Dialog
- Error Dialog
- Information Dialog
- Form Dialog

## Feedback Components

- Snackbar
- Toast Notification
- Loading Spinner
- Progress Bar
- Skeleton Loader
- Empty State
- Error State

## Dashboard Widgets

- KPI Widget
- Chart Widget
- Activity Widget
- Notification Widget
- Calendar Widget

---

# Shared Directives

- Permission Directive
- Feature Flag Directive
- Auto Focus
- Numeric Only
- Uppercase
- Lowercase
- Trim Input
- Debounce Click
- Disable Double Click
- Infinite Scroll

---

# Shared Pipes

- Date Format
- Time Format
- Currency
- Phone Number
- File Size
- Initials
- Safe HTML
- Relative Time
- Status Label

---

# Shared Validators

- Email
- Phone
- Password Strength
- Confirm Password
- File Size
- File Type
- Date Range
- Numeric Range

---

# Shared Services

- API Service
- Storage Service
- Dialog Service
- Notification Service
- Export Service
- Loader Service
- Theme Service
- Translation Service

---

# Shared Models

Common interfaces such as:

- ApiResponse
- Pagination
- UserSummary
- TenantInfo
- DropdownOption
- MenuItem
- Permission
- Role
- AuditLog

---

# Enums

- User Status
- Attendance Status
- Fault Priority
- Lead Status
- Notification Type
- Theme Mode
- Language
- Permission Action

---

# Constants

Centralize application constants:

- API Endpoints
- Date Formats
- Storage Keys
- Regex Patterns
- Default Page Size
- Validation Messages

---

# Utility Functions

- Date Utilities
- String Utilities
- Number Utilities
- File Utilities
- Download Helpers
- URL Helpers
- Object Utilities
- Permission Helpers

---

# Theme Resources

Shared theme assets:

- Color Tokens
- Typography
- Icons
- Logo Placeholders
- SCSS Variables

---

# Usage Guidelines

- Do not place business logic in the shared library.
- Keep components generic and reusable.
- Feature-specific components belong inside their respective feature modules.
- Avoid direct dependencies between feature modules.
- Export reusable items through a central `index.ts`.

---

# Best Practices

- Prefer composition over duplication.
- Use standalone components.
- Keep APIs simple and well documented.
- Follow Angular style guide.
- Maintain backward compatibility for shared components.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- PROJECT_STRUCTURE.md
- FEATURE_MODULES.md
- CODING_STANDARDS.md

---

# Version

Version: 1.0

Status: Approved for Implementation
