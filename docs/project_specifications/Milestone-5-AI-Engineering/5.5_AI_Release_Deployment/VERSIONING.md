
# VERSIONING.md

# Enterprise Versioning Strategy

## Purpose

This document defines the versioning standards for the AI_Engineering platform. It ensures consistent version identification across source code, APIs, Android applications, web applications, AI services, infrastructure, database schemas, documentation, and white-label tenant releases.

The strategy follows Semantic Versioning (SemVer 2.0.0) while extending it to support enterprise SaaS, multi-tenant deployments, feature flags, and AI model lifecycle management.

---

# Objectives

- Establish predictable release numbering
- Communicate compatibility clearly
- Support automated CI/CD pipelines
- Enable safe rollback
- Track every deployed artifact
- Maintain auditability across all environments

---

# Semantic Versioning

Format:

MAJOR.MINOR.PATCH

Example:

1.0.0
1.3.0
1.3.5
2.0.0

Rules:

- **MAJOR**: Breaking API, schema, or platform changes
- **MINOR**: New backward-compatible functionality
- **PATCH**: Bug fixes, security fixes, performance improvements

---

# Pre-release Identifiers

Examples:

1.5.0-alpha.1
1.5.0-beta.2
1.5.0-rc.1

Stages:

| Identifier | Purpose |
|------------|---------|
| alpha | Early internal development |
| beta | Feature-complete testing |
| rc | Release Candidate |
| stable | Production release |

---

# Build Metadata

Examples:

1.5.0+20260704
1.5.0+git.4f9ac12
1.5.0+build.2048

Metadata may include:

- Git Commit
- Build Number
- CI Pipeline ID
- Deployment Timestamp

---

# Repository Versioning

Every repository contains:

- VERSION file
- CHANGELOG.md
- Git Tags
- Release Notes
- Signed Release Artifacts

---

# Git Tag Convention

Examples:

v1.0.0
v1.2.3
v2.0.0-rc.1
v2.0.0

Tag rules:

- Immutable
- Signed
- Traceable
- Linked to Release Notes

---

# Branch Version Policy

- main → Stable releases
- develop → Next minor version
- release/* → Release candidates
- hotfix/* → Patch releases
- feature/* → Development only

---

# Component Versioning

## Backend APIs

- Semantic Versioning
- API version embedded in OpenAPI
- Backward compatibility maintained

Example:

/api/v1
/api/v2

---

## Angular Admin Portal

Version synchronized with platform release.

Example:

Platform 2.4.0
Admin Portal 2.4.0

---

## Android Application

Maintain:

- versionName (SemVer)
- versionCode (monotonically increasing integer)

Example:

versionName = 2.3.0
versionCode = 20300

---

## AI Services

Track:

- Prompt Version
- Model Version
- Embedding Version
- Evaluation Dataset Version

Example:

Prompt v4
Model v2.1
Embedding v3

---

## Database Schema

Every migration is versioned.

Examples:

V1__Initial.sql
V2__RBAC.sql
V3__FeatureFlags.sql
V4__Workflow.sql

Rules:

- Immutable migrations
- Sequential numbering
- Roll-forward preferred
- Rollback scripts maintained

---

## Infrastructure

Version:

- Kubernetes manifests
- Helm charts
- Terraform modules
- OCI configuration

Example:

infra-2.0.0

---

## Documentation

Major releases update:

- README
- Architecture
- API Docs
- Deployment Guide
- Security Docs
- Release Notes
- CHANGELOG

Documentation version should align with platform version.

---

# White-label Versioning

Each tenant tracks:

- Platform Version
- Branding Version
- Theme Version
- Module Configuration Version
- Feature Flag Version

This enables tenant-specific upgrades without affecting others.

---

# Feature Flag Versioning

Each feature stores:

- Feature Key
- Version
- Activation Date
- Rollout Percentage
- Target Tenant
- Status

---

# API Deprecation Policy

- Deprecation notice in documentation
- Minimum support window
- Sunset announcement
- Migration guide
- Version overlap before removal

---

# Dependency Versioning

Lock versions for:

- Node.js
- Angular
- NestJS
- Flutter
- PostgreSQL
- Redis
- Docker Base Images

Automated dependency scanning validates updates before release.

---

# Artifact Versioning

Version all release artifacts:

- Docker Images
- APK
- AAB
- Angular bundles
- API packages
- Helm charts
- Database scripts
- SBOM
- Release Notes

---

# CI/CD Integration

Pipeline automatically:

- Calculates version
- Creates Git tag
- Updates VERSION file
- Publishes release
- Signs artifacts
- Generates Release Notes
- Archives metadata

---

# Rollback Compatibility

Every release stores:

- Previous version
- Database compatibility
- Container image
- Mobile build
- Feature flag state
- Infrastructure manifests

Rollback must restore the complete deployment state.

---

# Audit Requirements

Every version records:

- Author
- Approval
- Build ID
- Commit Hash
- Deployment Time
- Environment
- Artifact Checksums

---

# Best Practices

- Never reuse version numbers
- Never modify released tags
- Tag every production release
- Keep CHANGELOG synchronized
- Sign production artifacts
- Automate version generation
- Preserve backward compatibility whenever possible

---

# Example Release Matrix

| Platform | Version |
|----------|---------|
| Platform | 2.5.0 |
| Admin Portal | 2.5.0 |
| Android | 2.5.0 |
| Backend API | 2.5.0 |
| AI Service | 2.5.0 |
| Database | V28 |
| Infrastructure | 2.5.0 |

---

# Related Documents

- README.md
- RELEASE_STRATEGY.md
- CHANGELOG.md
- PROJECT_STATE.md
- RELEASE_PIPELINE.md
- ROLLBACK_STRATEGY.md
- CI_CD.md
