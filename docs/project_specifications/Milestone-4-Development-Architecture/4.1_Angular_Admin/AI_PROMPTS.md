# AI_PROMPTS.md

# Angular Admin - AI Prompt Library

## Purpose

This document provides a standardized collection of AI prompts that can be used by developers, architects, QA engineers, and technical writers while developing the Angular Admin Portal. These prompts help accelerate development while maintaining consistency with the project's architecture and coding standards.

---

# Objectives

- Improve developer productivity
- Standardize AI-assisted development
- Generate consistent code
- Reduce repetitive work
- Support documentation generation
- Assist testing and code reviews

---

# General Instructions

Before generating code, always consider:

- Angular 21+
- Standalone Components
- TypeScript
- SCSS
- Angular Signals
- Reactive Forms
- REST APIs
- Multi-Tenant Architecture
- RBAC
- White Label Support
- Enterprise Coding Standards

---

# Component Generation

## Create Component

Generate an Angular standalone component using Angular 21 best practices.

Requirements:

- Standalone component
- SCSS styling
- Strong typing
- Angular Signals where appropriate
- Responsive layout
- Accessibility support
- No business logic inside template

---

# Page Generation

Generate a feature page that includes:

- Page header
- Breadcrumb
- Toolbar
- Search
- Filters
- Data table
- Loading state
- Empty state
- Error handling
- RBAC-aware actions

---

# Form Generation

Generate a Reactive Form with:

- Strong typing
- Shared validators
- Validation messages
- Responsive layout
- API integration hooks
- Loading indicator
- Error handling

---

# Table Generation

Generate a reusable data table supporting:

- Server-side pagination
- Sorting
- Filtering
- Search
- Export
- Row actions
- Bulk actions
- RBAC integration

---

# Dashboard Widget

Generate a reusable dashboard widget that includes:

- KPI display
- Loading state
- Error state
- Refresh support
- Theme integration
- Responsive layout

---

# API Service

Generate an Angular service that:

- Uses HttpClient
- Returns typed responses
- Handles errors
- Uses centralized API configuration
- Follows project folder structure

---

# State Management

Generate feature state using Angular Signals.

Requirements:

- Loading state
- Error state
- Data state
- Refresh methods
- Minimal global state

---

# Route Configuration

Generate feature routing with:

- Lazy loading
- Route guards
- RBAC metadata
- Breadcrumb configuration
- Page title

---

# RBAC

Generate permission-aware UI.

Requirements:

- Hide unauthorized actions
- Disable restricted controls
- Respect feature flags
- Backend-driven permissions

---

# Theme Integration

Generate components that:

- Use CSS variables
- Support light/dark mode
- Avoid hardcoded colors
- Use shared design tokens

---

# Unit Test

Generate Jest unit tests covering:

- Component creation
- Inputs
- Outputs
- Services
- Validation
- Error handling

---

# E2E Test

Generate Cypress tests covering:

- Login
- Navigation
- CRUD operations
- Form validation
- RBAC behavior
- Logout

---

# Documentation Prompt

Generate technical documentation containing:

- Purpose
- Responsibilities
- Folder structure
- Dependencies
- Configuration
- Best practices

---

# Code Review Prompt

Review code for:

- Angular best practices
- Performance
- Security
- Accessibility
- Maintainability
- Duplicate code
- Naming conventions
- Architecture compliance

---

# Bug Fix Prompt

Analyze the issue and provide:

- Root cause
- Recommended fix
- Impact analysis
- Testing approach
- Regression risks

---

# Refactoring Prompt

Refactor the implementation while:

- Preserving functionality
- Improving readability
- Reducing complexity
- Following project standards
- Increasing reusability

---

# SQL/API Prompt

Generate backend request models compatible with:

- REST APIs
- Pagination
- Filtering
- Sorting
- Validation

---

# Documentation Standards

All generated content should:

- Follow project terminology
- Use implementation-focused language
- Match project folder structure
- Follow coding standards
- Avoid placeholders

---

# AI Usage Guidelines

Always request AI-generated output that is:

- Production-oriented
- Strongly typed
- Reusable
- Secure
- Accessible
- Responsive
- Well documented
- Testable

Always review AI-generated code before committing it to the repository.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- CODING_STANDARDS.md
- API_LAYER.md
- TESTING.md
- RBAC.md
- SHARED_LIBRARY.md

---

# Version

Version: 1.0

Status: Approved for Implementation
