# Flutter Mobile (README)

## Purpose

The Flutter Mobile application is the primary Android client for the Enterprise Multi-Tenant Workforce Management SaaS Platform. It supports offline-first field operations, GPS attendance, fault management, lead management, notifications, and configurable modules delivered through the Platform Module Engine.

## Objectives

- Enterprise-grade Android application
- Multi-tenant architecture
- RBAC-driven UI and API authorization
- White-label branding
- Offline-first synchronization
- Secure authentication
- Dynamic module loading
- High performance and scalability

## Core Capabilities

### Authentication

- Client Code based login
- Super Admin login
- JWT + Refresh Tokens
- Biometric login
- Device binding
- MFA (future)

### Tenant Awareness

- Client branding
- Theme
- Logo
- Feature flags
- Module availability
- Language
- Time zone

### Dynamic Module Engine

The mobile app never hardcodes module availability. Modules are rendered from backend configuration.

Supported modules:

- Attendance
- GPS Tracking
- Leave
- Fault Management
- Lead Management
- Notifications
- Documents
- Reports
- Profile
- Settings

## Mobile Architecture

Presentation

- Flutter
- Riverpod
- GoRouter

Domain

- Use Cases
- Repository Interfaces

Data

- REST API
- Local Database
- Sync Engine
- Secure Storage

Infrastructure

- HTTP
- GPS
- Camera
- Biometrics
- Notifications

## Folder Structure

lib/
core/
modules/
shared/
services/
sync/
offline/
routing/
localization/
widgets/

## Offline First

Features:

- Local persistence
- Retry queue
- Conflict detection
- Merge strategy
- Background synchronization

## Security

- HTTPS only
- Certificate pinning
- JWT
- Refresh Tokens
- Secure Storage
- Root detection
- Screenshot protection (sensitive screens)

## RBAC

Menus, screens, buttons and actions are downloaded according to tenant role permissions.

## Supported Business Modules

Attendance
GPS Visit
Fault Management
Lead Management
Notifications
Reports
Profile

## Integrations

- REST APIs
- Firebase Cloud Messaging
- Maps
- Camera
- File Upload
- Digital Signature

## Performance Targets

- Cold start <3 sec
- Sync resilient
- Low battery GPS
- Pagination

## Testing

- Unit
- Widget
- Integration
- Offline sync
- Security
- Performance

## CI/CD

GitHub Actions
Static Analysis
Automated Tests
APK generation

## Future Roadmap

Payroll
Assets
CRM
Inventory
AI Assistant
Voice Commands

## Status

This document reflects the enterprise architecture discussed for the Workforce Management SaaS Platform and supersedes the earlier ISP-centric design.
