# STATE_MANAGEMENT.md

# Angular Admin - State Management

## Purpose

This document defines the state management strategy for the Angular Admin Portal. The objective is to keep application state predictable, scalable, reactive, and easy to maintain while leveraging modern Angular Signals.

---

# Objectives

- Centralized application state
- Predictable data flow
- High performance
- Minimal boilerplate
- Feature isolation
- Easy debugging
- Reactive UI updates
- Scalable architecture

---

# Recommended Approach

The Angular Admin Portal should use:

- Angular Signals
- Signal Store (where applicable)
- RxJS for asynchronous operations
- Dependency Injection for shared services

Avoid unnecessary global state. Keep state close to the feature whenever possible.

---

# State Categories

## Global State

Shared across the entire application.

Includes:

- Authentication
- Logged-in User
- Tenant Information
- Permissions
- Application Configuration
- Theme
- Language
- Notifications

---

## Feature State

Owned by a single feature module.

Examples:

- Attendance
- GPS
- Faults
- Leads
- Reports
- Settings
- Documents

Each feature manages its own state independently.

---

## Component State

Local UI state.

Examples:

- Dialog visibility
- Selected tab
- Search text
- Filters
- Pagination
- Form values
- Loading indicators

Component state should not be promoted to global state unless shared.

---

# Suggested State Structure

```text
state/
├── auth/
├── tenant/
├── user/
├── dashboard/
├── settings/
├── notification/
├── shared/
└── feature/
    ├── attendance/
    ├── gps/
    ├── faults/
    ├── leads/
    └── reports/
```

---

# Authentication State

Stores:

- Access Token
- Refresh Token
- Logged-in User
- Login Status
- Session Expiry

Responsibilities:

- Login
- Logout
- Session Refresh
- Authentication Validation

---

# User State

Contains:

- User Profile
- Employee Details
- Assigned Roles
- Permissions
- Preferences

---

# Tenant State

Contains:

- Tenant Information
- Branding
- Theme
- Enabled Modules
- Licensed Features
- Time Zone
- Language

---

# Dashboard State

Stores:

- KPI Data
- Widgets
- Recent Activities
- Dashboard Filters

---

# Notification State

Stores:

- In-App Notifications
- Notification Count
- Unread Status
- Toast Queue

---

# Feature State

Every feature module owns its own state.

Example:

Attendance State

- Daily Attendance
- Monthly Summary
- Leave Balance
- Filters
- Loading Status

Fault State

- Fault List
- Current Fault
- Status Summary
- Assignments

Lead State

- Pipeline
- Lead Status
- Follow-ups
- Conversion Metrics

---

# Data Flow

Typical flow:

```text
Component
    │
Signal Store / Service
    │
API Service
    │
Backend
    │
Response
    │
Update State
    │
UI Refresh
```

---

# State Responsibilities

State should manage:

- Current Data
- Loading Status
- Error State
- Filters
- Pagination
- Sorting

Business rules belong in services, not state objects.

---

# API Synchronization

Each feature should:

1. Request data
2. Update loading state
3. Process response
4. Update signals
5. Refresh UI
6. Handle errors

---

# Caching Strategy

Recommended caching:

- User Profile
- Tenant Configuration
- Permissions
- Menus
- Lookup Data
- Settings

Refresh cache when relevant configuration changes.

---

# Error Handling

Each state should expose:

- Loading
- Success
- Error

This simplifies UI rendering and improves user experience.

---

# Performance Guidelines

- Use Signals for reactive updates
- Minimize global state
- Lazy load feature state
- Avoid unnecessary subscriptions
- Dispose resources when components are destroyed

---

# Offline Considerations

For future offline support:

- Queue pending requests
- Cache lookup data
- Synchronize when online
- Resolve conflicts using backend rules

---

# Best Practices

- Keep state small and focused.
- Separate UI state from business data.
- Do not duplicate API responses unnecessarily.
- Encapsulate state updates through stores/services.
- Keep feature state independent.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- PROJECT_STRUCTURE.md
- FEATURE_MODULES.md
- SHARED_LIBRARY.md
- ROUTING.md
- API_SPEC.md

---

# Version

Version: 1.0

Status: Approved for Implementation
