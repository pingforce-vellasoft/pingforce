# ARCHITECTURE.md

# Angular Admin Portal Architecture

## Purpose

This document defines the implementation architecture for the Angular Admin Portal of the Enterprise Multi-Tenant Workforce Management SaaS Platform. It provides the high-level structure, major modules, integration points, and implementation guidelines. It is intentionally concise and implementation-focused rather than a detailed design specification.

---

# Objectives

- Enterprise-grade Angular application
- Multi-tenant support
- Dynamic RBAC
- White-label ready
- Metadata-driven UI
- Modular architecture
- Scalable and maintainable codebase

---

# Technology Stack

| Area           | Technology                     |
| -------------- | ------------------------------ |
| Framework      | Angular 21+                    |
| Language       | TypeScript                     |
| UI             | Angular Material               |
| Styling        | SCSS                           |
| State          | Angular Signals / Signal Store |
| Authentication | JWT + Refresh Token            |
| API            | REST                           |
| Charts         | ApexCharts                     |
| Build          | Angular CLI                    |

---

# High-Level Architecture

```
Browser
    │
Angular Admin Portal
    │
Authentication Layer
    │
RBAC & Permission Engine
    │
Feature Modules
    │
REST API
    │
Backend Services
    │
Database
```

---

# Core Architecture Layers

## Core

- Authentication
- Authorization
- HTTP Interceptors
- Route Guards
- Global Error Handling
- App Configuration

## Shared

- Reusable Components
- Directives
- Pipes
- Utilities
- Common Models

## Layout

- Login
- Dashboard
- Sidebar
- Header
- Footer
- Breadcrumb

## Features

- Dashboard
- Users
- Roles
- Permissions
- Attendance
- GPS
- Fault Management
- Lead Management
- Reports
- Notifications
- Settings

---

# Module Architecture

Every feature follows the same structure.

```
Feature
├── Pages
├── Components
├── Services
├── Models
├── Guards
├── Routes
└── Store
```

---

# Routing

- Lazy loaded feature routes
- Route guards
- Permission-based navigation
- Tenant-aware routing

---

# Authentication

- Login
- Refresh Token
- Logout
- Session Timeout
- Device Validation

---

# Authorization

Permission checks at:

- Menu
- Route
- Component
- Button
- API

Supported concepts:

- Roles
- Permissions
- Permission Groups
- Data Scope

---

# Dynamic Menu

Menu is loaded from backend.

Visibility depends on:

- Tenant
- Role
- Licensed Modules
- Feature Flags

---

# Multi-Tenant

Each tenant has independent:

- Branding
- Theme
- Modules
- Users
- Roles
- Permissions
- Settings

---

# White Label

Tenant specific:

- Logo
- Theme
- Company Name
- Application Name
- Colors

---

# State Management

Use Angular Signals for:

- User Session
- Permissions
- Tenant Information
- Dashboard State
- Filters

---

# API Integration

Common API service with:

- Authentication header
- Error handling
- Retry support
- Loading indicator

---

# Security

- JWT
- HTTPS
- Secure Token Storage
- Session Timeout
- Audit Logging
- Input Validation

---

# Performance

- Lazy Loading
- OnPush Change Detection
- Signals
- Virtual Scrolling
- Pagination
- Server-side Filtering

---

# Folder Structure

```
Angular_Admin/
├── core/
├── shared/
├── layout/
├── features/
├── services/
├── models/
├── guards/
├── interceptors/
├── environments/
└── assets/
```

---

# Development Standards

- Standalone Components
- Strict TypeScript
- Reactive Forms
- Reusable Components
- Feature-based Organization
- Consistent Naming
- ESLint + Prettier

---

# Integration Points

- Authentication Service
- User Service
- Attendance Service
- GPS Service
- Fault Service
- Lead Service
- Notification Service
- Report Service
- Settings Service

---

# Future Ready

Architecture supports future modules such as:

- HRMS
- Payroll
- CRM
- Inventory
- Asset Management
- Procurement
- Customer Portal

without major architectural changes.

---

# Related Documents

- README.md
- DATABASE_SCHEMA.md
- API_SPEC.md
- RBAC.md
- PERMISSION_MATRIX.md
- AUTHENTICATION.md
- MULTI_TENANCY.md
- WHITE_LABEL_ENGINE.md

---

# Version

Version: 1.0

Status: Approved for Implementation
