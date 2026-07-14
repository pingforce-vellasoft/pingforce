# ROUTING.md

# Angular Admin - Routing Architecture

## Purpose

This document defines the routing strategy for the Angular Admin Portal. It explains how application routes are organized, secured, lazy-loaded, and dynamically controlled based on tenant configuration, licensing, and RBAC permissions.

---

# Objectives

- Feature-based routing
- Lazy loading
- Secure navigation
- Dynamic menu integration
- RBAC enforcement
- Multi-tenant awareness
- White-label compatibility
- Scalable route organization

---

# Routing Principles

The routing architecture follows these principles:

- Standalone Angular routing
- Feature-first organization
- Route-level authorization
- Lazy-loaded feature modules
- No hardcoded business navigation
- Centralized route configuration
- Metadata-driven navigation

---

# Routing Flow

```text
User Login
      │
Authentication
      │
Load User Profile
      │
Load Tenant Configuration
      │
Load Permissions
      │
Load Licensed Modules
      │
Generate Dynamic Menu
      │
Navigate to Dashboard
      │
Access Feature Routes
```

---

# Route Categories

## Public Routes

Accessible without authentication.

Examples:

- Login
- Forgot Password
- Reset Password
- Unauthorized
- Session Expired

---

## Protected Routes

Require authenticated users.

Examples:

- Dashboard
- Attendance
- GPS
- Leads
- Faults
- Reports
- Settings

---

## Administrative Routes

Require elevated permissions.

Examples:

- User Management
- Role Management
- Permission Management
- Tenant Management
- Feature Flags
- Branding
- Subscription Management

---

# Suggested Route Structure

```text
/
├── login
├── forgot-password
├── dashboard
├── users
├── roles
├── permissions
├── organization
├── attendance
├── gps
├── faults
├── leads
├── reports
├── notifications
├── documents
├── assets
├── settings
├── profile
└── unauthorized
```

---

# Feature Routing

Each feature owns its own routing configuration.

Example structure:

```text
attendance/
├── attendance.routes.ts
├── pages/
├── components/
└── services/
```

Benefits:

- Independent development
- Easier maintenance
- Lazy loading
- Better scalability

---

# Lazy Loading Strategy

All business modules should be lazy loaded.

Benefits:

- Faster application startup
- Smaller initial bundle
- Better performance
- Independent deployment readiness

---

# Route Guards

Recommended guards:

- Auth Guard
- Role Guard
- Permission Guard
- Tenant Guard
- Feature Flag Guard
- Subscription Guard

Each guard validates a specific responsibility before route activation.

---

# Permission-Based Routing

Before navigation, validate:

- User authentication
- Tenant status
- Active subscription
- Enabled module
- Required permission
- Feature availability

If validation fails:

- Redirect to Unauthorized page
- Display appropriate message
- Log access attempt (optional)

---

# Dynamic Menu Integration

Navigation menu should be generated from backend metadata.

Menu visibility depends on:

- Tenant
- User Role
- Permissions
- Licensed Modules
- Feature Flags

Routes should not appear if users cannot access them.

---

# Route Metadata

Each route should define metadata such as:

- Page Title
- Icon
- Permission Code
- Module Name
- Breadcrumb
- Feature Flag
- Menu Visibility

This metadata supports dynamic navigation and authorization.

---

# Dashboard Routing

After login:

1. Authenticate user
2. Load tenant configuration
3. Load permissions
4. Load menu
5. Redirect to default dashboard

Dashboard type depends on role:

- Super Admin
- Employer
- Manager
- Employee

---

# Error Routes

Provide dedicated pages for:

- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Server Error
- Session Expired

---

# Breadcrumb Strategy

Breadcrumbs should be generated automatically from route metadata.

Example:

Dashboard > Attendance > Daily Report

---

# URL Guidelines

Use:

- Lowercase paths
- Hyphen-separated names
- REST-style route naming
- Consistent hierarchy

Examples:

```
/attendance
/attendance/daily
/faults/create
/users/123/edit
```

---

# Security Considerations

- Never rely solely on frontend route protection.
- Backend APIs must validate permissions.
- Hide inaccessible routes from navigation.
- Prevent direct URL access without authorization.

---

# Best Practices

- Keep routing feature-based.
- Avoid deeply nested routes unless necessary.
- Use lazy loading for all business modules.
- Store permission codes centrally.
- Keep route configuration simple and maintainable.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- PROJECT_STRUCTURE.md
- FEATURE_MODULES.md
- SHARED_LIBRARY.md
- RBAC.md
- PERMISSION_MATRIX.md
- AUTHENTICATION.md

---

# Version

Version: 1.0

Status: Approved for Implementation
