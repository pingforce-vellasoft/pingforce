# WHITE_LABEL.md

# Angular Admin - White Label Architecture

## Purpose

This document defines the white-label capabilities of the Angular Admin Portal. The platform is designed as a multi-tenant SaaS application where each client (tenant) can have its own branding, identity, configuration, and enabled business modules without requiring code changes.

---

# Objectives

- Support multiple branded clients
- Tenant-specific UI and identity
- Backend-driven branding
- No code changes for onboarding new tenants
- Consistent implementation across Web and Mobile

---

# White Label Scope

Each tenant can customize:

- Company Name
- Application Name
- Logo
- Favicon
- Login Background
- Primary & Secondary Colors
- Theme (Light/Dark)
- Fonts
- Landing Dashboard
- Enabled Modules
- Feature Flags
- Language
- Time Zone
- Date & Time Format

---

# Architecture Overview

```text
User Login
      │
Client Code
      │
Load Tenant Configuration
      │
Load Branding
      │
Load Theme
      │
Load Modules
      │
Load Permissions
      │
Render Tenant Specific UI
```

---

# Tenant Branding

Branding configuration should include:

- Company Display Name
- Short Name
- Logo
- Small Logo
- Favicon
- Login Banner
- Splash Image
- Email Header Logo

Assets are referenced through configuration instead of hardcoded paths.

---

# Theme Configuration

Supported options:

- Primary Color
- Secondary Color
- Accent Color
- Background Color
- Surface Color
- Success / Warning / Error Colors
- Typography
- Border Radius
- Density

Theme values should be loaded during application initialization.

---

# Application Identity

Tenant-specific identity includes:

- Browser Title
- Application Name
- Footer Text
- Copyright
- Support Email
- Support Phone
- Website URL

---

# Module Configuration

Each tenant can enable or disable modules independently.

Examples:

- Attendance
- GPS
- Fault Management
- Lead Management
- Reports
- Documents
- Assets
- Notifications

Disabled modules should not appear in navigation or routes.

---

# Feature Flags

Feature flags allow tenant-specific functionality without deployment.

Examples:

- GPS Mandatory
- Offline Attendance
- Biometric Attendance
- Digital Signature
- WhatsApp Notifications
- Email Notifications
- Push Notifications

---

# Login Experience

Tenant-specific login screen may include:

- Logo
- Background Image
- Welcome Message
- Company Name
- Theme Colors

Super Admin login remains platform branded.

---

# Navigation

Menus are generated dynamically based on:

- Licensed Modules
- Enabled Features
- User Permissions
- Tenant Configuration

---

# Localization

Tenant configuration may define:

- Default Language
- Supported Languages
- Time Zone
- Date Format
- Number Format
- Currency Format

---

# Notification Branding

Communication templates may include:

- Company Logo
- Sender Name
- Email Signature
- Brand Colors
- Contact Information

Channels:

- Email
- Push
- WhatsApp
- SMS

---

# Security

Tenant configuration must be isolated.

Rules:

- No cross-tenant branding access
- Tenant assets loaded securely
- Configuration validated by backend
- Tenant resolved after authentication

---

# Administration

Super Admin can manage:

- Tenant Branding
- Themes
- Modules
- Feature Flags
- License Details
- Subscription Status
- Default Settings

Tenant Administrators can manage only their organization's branding and configuration where permitted.

---

# Implementation Guidelines

- Load branding once during login.
- Cache tenant configuration.
- Refresh configuration after administrative changes.
- Keep branding configuration outside application code.
- Use configuration-driven UI wherever possible.

---

# Best Practices

- Never hardcode customer branding.
- Keep themes configurable.
- Use shared UI components.
- Separate branding from business logic.
- Validate all tenant configuration on the backend.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- AUTHENTICATION.md
- RBAC.md
- ROUTING.md
- STATE_MANAGEMENT.md
- FEATURE_MODULES.md
- MULTI_TENANCY.md

---

# Version

Version: 1.0

Status: Approved for Implementation
