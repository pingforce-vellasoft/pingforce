# RBAC.md

# Angular Admin - Role-Based Access Control (RBAC)

## Purpose

This document defines the Role-Based Access Control (RBAC) architecture for the Angular Admin Portal. The RBAC system controls access to modules, menus, pages, actions, APIs, and data based on user roles and assigned permissions within each tenant.

---

# Objectives

- Secure access control
- Tenant isolation
- Fine-grained permissions
- Dynamic authorization
- Configurable roles
- Scalable permission model
- Backend-driven security

---

# RBAC Architecture

```text
Tenant
   │
Roles
   │
Permission Groups
   │
Permissions
   │
Actions
   │
Menus
Routes
Components
APIs
Data
```

The backend is the source of truth for all authorization decisions.

---

# Core Components

## Tenant

Each tenant has its own:

- Users
- Roles
- Permissions
- Modules
- Feature Flags
- Business Rules

Roles and permissions are isolated between tenants.

---

## Users

A user may have one or more assigned roles depending on business requirements.

Examples:

- Super Admin
- Employer
- Manager
- Team Lead
- Employee

---

## Roles

Roles define a collection of permissions.

Typical roles include:

- Super Admin
- Client Admin
- Employer
- Manager
- Supervisor
- HR
- Employee
- Read Only User

Roles should not contain business logic.

---

## Permission Groups

Permissions are organized into logical groups.

Examples:

- User Management
- Attendance
- GPS
- Fault Management
- Lead Management
- Reports
- Documents
- Assets
- Settings

---

## Permissions

Permissions represent functional capabilities.

Examples:

- View Users
- Create User
- Edit User
- Delete User
- Export Users

- View Attendance
- Approve Attendance
- Edit Attendance

- View Reports
- Export Reports

Permission codes should be unique and centrally managed.

---

## Actions

Supported actions include:

- View
- Create
- Edit
- Delete
- Assign
- Approve
- Reject
- Export
- Import
- Configure

Additional actions can be introduced without changing the architecture.

---

# Data Scope

Permissions may also define data visibility.

Supported scopes:

- Self
- Team
- Department
- Branch
- Region
- Company
- Global

This enables row-level access control without creating excessive roles.

---

# Permission Evaluation Flow

```text
Login
   │
Load User
   │
Load Roles
   │
Load Permissions
   │
Load Tenant Configuration
   │
Generate Menu
   │
Validate Route
   │
Validate Action
   │
Execute Request
```

---

# Menu Authorization

Menu visibility depends on:

- Enabled Module
- Assigned Role
- Granted Permission
- Feature Flag
- Tenant License

Users should never see menu items they cannot access.

---

# Route Authorization

Every protected route should validate:

- Authentication
- Active Tenant
- Active Subscription
- Required Permission
- Feature Availability

Unauthorized users should be redirected to the access denied page.

---

# Component Authorization

UI components should respect permissions.

Examples:

- Hide Create button
- Disable Edit button
- Hide Delete action
- Hide Export option

The backend must also validate every request.

---

# API Authorization

Frontend authorization improves usability but does not replace backend security.

Every protected API must validate:

- Authentication
- Tenant
- Role
- Permission
- Data Scope

---

# Dynamic Permissions

Permissions are loaded from the backend during login.

This allows administrators to:

- Create new roles
- Update permissions
- Enable or disable modules
- Modify access without redeploying the frontend

---

# Feature Flag Integration

RBAC works together with feature flags.

Access depends on:

- Feature Enabled
- Module Licensed
- Permission Granted

All three conditions must be satisfied before functionality is available.

---

# Super Admin Access

Super Admin has platform-level administration capabilities.

Typical responsibilities:

- Tenant Management
- Subscription Management
- White Label Configuration
- Global Settings
- Platform Monitoring

Super Admin is not restricted by tenant-specific permissions.

---

# Audit & Security

Authorization events should support auditing of:

- Login
- Role Changes
- Permission Changes
- Access Denied Events
- Administrative Actions

---

# Best Practices

- Keep roles simple.
- Use permissions instead of creating many roles.
- Separate data scope from functional permissions.
- Never trust frontend authorization alone.
- Validate permissions on every protected API.
- Centralize permission codes.
- Use backend-driven menus and authorization.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- AUTHENTICATION.md
- ROUTING.md
- API_LAYER.md
- PERMISSION_MATRIX.md
- MULTI_TENANCY.md

---

# Version

Version: 1.0

Status: Approved for Implementation
