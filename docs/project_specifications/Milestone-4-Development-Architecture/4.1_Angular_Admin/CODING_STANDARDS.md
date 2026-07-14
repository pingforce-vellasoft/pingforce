# CODING_STANDARDS.md

# Angular Admin - Coding Standards

## Purpose

This document defines the coding standards and development guidelines for the Angular Admin Portal. Following these standards ensures consistency, readability, maintainability, scalability, and high-quality code across the project.

---

# Objectives

- Maintain consistent coding practices
- Improve code readability
- Simplify maintenance
- Encourage reusable code
- Reduce technical debt
- Improve collaboration
- Support enterprise-scale development

---

# General Principles

- Follow the Angular Style Guide.
- Write clean and self-explanatory code.
- Keep solutions simple and maintainable.
- Prefer composition over inheritance.
- Avoid duplicate code.
- Keep business logic out of UI components.

---

# Technology Standards

| Area | Standard |
|------|----------|
| Framework | Angular 21+ |
| Language | TypeScript |
| Styling | SCSS |
| Architecture | Standalone Components |
| State | Angular Signals |
| Forms | Reactive Forms |
| API | REST |
| Package Manager | npm |

---

# Project Structure

Follow the project structure defined in:

- PROJECT_STRUCTURE.md
- FEATURE_MODULES.md
- SHARED_LIBRARY.md

Organize code by feature rather than by technical layer whenever possible.

---

# Naming Conventions

## Files

Use kebab-case.

Examples:

- user-list.component.ts
- attendance.service.ts
- auth.interceptor.ts

## Classes

Use PascalCase.

Examples:

- UserService
- AttendanceComponent
- AuthGuard

## Variables

Use camelCase.

Examples:

- userProfile
- attendanceList
- selectedEmployee

## Constants

Use UPPER_SNAKE_CASE where appropriate.

Examples:

- DEFAULT_PAGE_SIZE
- MAX_UPLOAD_SIZE

---

# Component Guidelines

- One responsibility per component.
- Keep components focused.
- Reuse shared components.
- Prefer standalone components.
- Avoid large template files.

Separate:

- Presentation
- Business logic
- API interaction

---

# Service Guidelines

Services should:

- Handle business logic
- Call backend APIs
- Transform data
- Remain reusable

Components should not contain HTTP logic.

---

# State Management

- Use Angular Signals.
- Keep global state minimal.
- Store feature state close to the feature.
- Avoid duplicate state.

Refer to STATE_MANAGEMENT.md.

---

# Form Standards

- Use Reactive Forms.
- Reuse shared validators.
- Display validation messages consistently.
- Keep form models strongly typed.

---

# Table Standards

All data grids should use the shared table framework.

Support:

- Pagination
- Sorting
- Filtering
- Export
- RBAC

Refer to TABLE_FRAMEWORK.md.

---

# Routing Standards

- Lazy-load business modules.
- Protect routes using guards.
- Use feature-based routing.
- Keep route configuration modular.

Refer to ROUTING.md.

---

# API Standards

- Use shared API services.
- Strongly type requests and responses.
- Handle errors centrally.
- Avoid duplicate API logic.

Refer to API_LAYER.md.

---

# Error Handling

- Handle errors centrally.
- Display user-friendly messages.
- Never expose technical details.
- Log unexpected errors.

Refer to ERROR_HANDLING.md.

---

# Security Guidelines

- Never hardcode secrets.
- Validate permissions on backend.
- Sanitize user input.
- Protect routes.
- Use HTTPS.
- Store authentication data securely.

---

# Performance Guidelines

- Use lazy loading.
- Minimize change detection.
- Reuse components.
- Optimize API calls.
- Avoid unnecessary rendering.

Refer to PERFORMANCE.md.

---

# Styling Standards

- Use SCSS.
- Reuse design tokens.
- Avoid inline styles.
- Keep styling modular.
- Follow Theme Engine guidelines.

---

# Documentation

Every feature should include:

- Purpose
- Responsibilities
- Public APIs
- Configuration
- Limitations (if any)

Update documentation whenever behavior changes.

---

# Testing Standards

Write tests for:

- Components
- Services
- Guards
- Interceptors
- Validators
- Business logic

Refer to TESTING.md.

---

# Code Review Checklist

Before merging:

- Code builds successfully
- No lint errors
- No unused imports
- No commented dead code
- Naming conventions followed
- Tests updated
- Documentation updated

---

# Git Guidelines

- Use meaningful commit messages.
- Keep commits focused.
- Avoid committing generated files.
- Review changes before merging.

---

# Best Practices

- Prefer reusable solutions.
- Keep methods small and focused.
- Avoid deep nesting.
- Use strong typing.
- Keep dependencies minimal.
- Write maintainable code first.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- PROJECT_STRUCTURE.md
- FEATURE_MODULES.md
- API_LAYER.md
- ROUTING.md
- PERFORMANCE.md
- TESTING.md

---

# Version

Version: 1.0

Status: Approved for Implementation
