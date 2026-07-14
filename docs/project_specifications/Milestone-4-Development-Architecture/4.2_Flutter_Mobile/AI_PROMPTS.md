# Flutter Mobile AI Prompts Specification

## Purpose

This document defines the standard AI prompt library for the Flutter
Mobile application of the Enterprise Multi-Tenant Workforce Management
SaaS Platform. It specifies the prompts, prompt engineering standards,
governance, security controls, and AI-assisted engineering workflows
that shall be used during design, development, testing, documentation,
DevOps, security, and future AI-powered platform capabilities.

This document is a future-state engineering specification.

------------------------------------------------------------------------

# Objectives

The AI prompt framework shall:

-   Standardize AI-assisted engineering
-   Improve developer productivity
-   Produce consistent architecture and code
-   Reduce implementation errors
-   Preserve enterprise architecture standards
-   Accelerate documentation generation
-   Support secure AI usage
-   Enable future AI agents

------------------------------------------------------------------------

# Guiding Principles

-   Human review is mandatory
-   AI assists but does not replace engineering judgment
-   Prompts shall be reusable
-   Prompts shall align with Clean Architecture
-   Tenant data shall never be exposed
-   Sensitive information shall never be included
-   Generated output shall comply with coding standards

------------------------------------------------------------------------

# Prompt Categories

The prompt catalog shall include:

-   Architecture
-   Flutter Development
-   UI/UX
-   Riverpod
-   Clean Architecture
-   Repository Pattern
-   Offline Engine
-   Synchronization
-   Authentication
-   RBAC
-   GPS
-   Notifications
-   File Upload
-   White Label
-   Theme Engine
-   Security
-   Performance
-   Testing
-   DevOps
-   Documentation
-   Code Review
-   Refactoring
-   SQL/API Design
-   Release Engineering

------------------------------------------------------------------------

# Architecture Prompts

## Enterprise Module Design

Purpose: Generate architecture for a new business module that follows
feature-first Clean Architecture, supports offline-first operation,
RBAC, synchronization, multi-tenancy and white-label configuration.

Expected Output:

-   Folder structure
-   Layer responsibilities
-   Data flow
-   Integration points
-   Risks
-   Testing strategy

------------------------------------------------------------------------

# Flutter Development Prompts

Generate production-ready Flutter code that:

-   Uses Riverpod
-   Follows Clean Architecture
-   Avoids business logic in widgets
-   Supports localization
-   Supports accessibility
-   Uses immutable models
-   Includes error handling
-   Includes documentation
-   Includes tests

------------------------------------------------------------------------

# UI Generation Prompts

Generate responsive Flutter UI that supports:

-   Material Design 3
-   Theme tokens
-   White-label branding
-   Light/Dark mode
-   Tablet support
-   Accessibility
-   Localization

------------------------------------------------------------------------

# Repository Prompts

Generate repository contracts and implementations that:

-   Support remote and local data
-   Integrate Offline Engine
-   Integrate Sync Engine
-   Return typed results
-   Handle failures consistently

------------------------------------------------------------------------

# Offline Engine Prompts

Generate offline workflows including:

-   Queue management
-   Retry logic
-   Conflict resolution
-   Delta synchronization
-   Local persistence
-   Audit metadata

------------------------------------------------------------------------

# Synchronization Prompts

Generate synchronization logic supporting:

-   Upload queues
-   Download queues
-   Batch processing
-   Retry
-   Idempotency
-   Conflict handling

------------------------------------------------------------------------

# Authentication Prompts

Generate authentication flows supporting:

-   Client Code login
-   JWT
-   Refresh tokens
-   Secure storage
-   Session management
-   Biometric authentication
-   MFA-ready architecture

------------------------------------------------------------------------

# RBAC Prompts

Generate permission-driven architecture supporting:

Role → Permission Group → Permission → Action → Data Scope

Include UI authorization, API authorization and menu authorization.

------------------------------------------------------------------------

# GPS Prompts

Generate GPS services supporting:

-   Geofencing
-   Background tracking
-   Attendance validation
-   Route history
-   Battery optimization
-   Offline buffering

------------------------------------------------------------------------

# Notification Prompts

Generate notification workflows supporting:

-   Push
-   In-App
-   WhatsApp
-   Email
-   Templates
-   Deep links
-   Retry
-   Analytics

------------------------------------------------------------------------

# White Label Prompts

Generate runtime branding architecture including:

-   Theme
-   Logo
-   App name
-   Feature flags
-   Licensing
-   Localization
-   Tenant configuration

------------------------------------------------------------------------

# Security Prompts

Generate secure implementations aligned with:

-   OWASP Mobile
-   Zero Trust
-   Secure storage
-   Certificate pinning
-   Encryption
-   Tenant isolation
-   Audit logging

------------------------------------------------------------------------

# Testing Prompts

Generate:

-   Unit tests
-   Widget tests
-   Integration tests
-   End-to-end tests
-   Performance tests
-   Security tests
-   Offline tests

------------------------------------------------------------------------

# Documentation Prompts

Generate enterprise Markdown documentation including:

-   Purpose
-   Scope
-   Architecture
-   Diagrams
-   Standards
-   Governance
-   Future roadmap

Use specification language such as "shall", "should", and "may" instead
of implementation status.

------------------------------------------------------------------------

# Code Review Prompt

Review code for:

-   Clean Architecture compliance
-   SOLID principles
-   Performance
-   Security
-   Accessibility
-   Localization
-   Test coverage
-   Maintainability

Provide findings categorized as Critical, High, Medium and Low.

------------------------------------------------------------------------

# Refactoring Prompt

Refactor code while:

-   Preserving behavior
-   Reducing complexity
-   Improving readability
-   Increasing testability
-   Eliminating duplication
-   Maintaining architecture boundaries

------------------------------------------------------------------------

# Prompt Governance

Prompts shall:

-   Be version controlled
-   Be reviewed periodically
-   Be reusable
-   Be documented
-   Be traceable to architecture standards

------------------------------------------------------------------------

# AI Safety

The AI workflow shall never expose:

-   Passwords
-   API keys
-   Tokens
-   Customer PII
-   Tenant secrets
-   Production credentials

Sensitive information shall be replaced with placeholders.

------------------------------------------------------------------------

# Integration

AI-assisted workflows shall integrate with:

-   Architecture documents
-   Coding Standards
-   Testing Standards
-   Security Standards
-   CI/CD
-   Documentation generation
-   Code Review
-   Pull Request templates

------------------------------------------------------------------------

# Future Expansion

The prompt library shall support autonomous engineering agents,
documentation agents, QA agents, DevOps agents, architecture assistants,
code migration assistants, multilingual documentation generation and
enterprise knowledge retrieval without restructuring the prompt
framework.

------------------------------------------------------------------------

# Conclusion

This AI Prompt Specification establishes a standardized prompt
engineering framework for the Flutter Mobile platform. It provides
reusable, governed and secure prompts that align with the enterprise
architecture, improve engineering productivity, maintain consistency
across teams and support the long-term evolution of the Workforce
Management SaaS Platform.
