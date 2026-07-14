# RefreshToken.md

# Enterprise Workforce Platform

## Authentication Module – Refresh Token Strategy Specification

**Module:** Core Platform → Authentication  
**Document:** Refresh Token Strategy  
**Version:** 1.0.0  
**Status:** Approved for Architecture & Detailed Design

---

# 1. Purpose

This document defines the refresh token architecture used by the Enterprise Workforce Platform. Refresh tokens enable secure session continuity by issuing new short-lived access tokens without requiring users to log in repeatedly.

The strategy is designed for:

- Multi-tenant SaaS
- Angular Admin Portal
- Flutter Mobile Application
- NestJS REST APIs
- Future SSO/MFA integration
- Horizontally scalable deployments

---

# 2. Objectives

The refresh token mechanism shall:

- Minimize login prompts
- Reduce exposure of long-lived access tokens
- Support secure token rotation
- Detect token replay attacks
- Allow immediate session revocation
- Support multiple devices per user
- Maintain complete audit history

---

# 3. Core Principles

- Access tokens are short-lived JWTs.
- Refresh tokens are opaque random values.
- Refresh tokens are never JWTs.
- Every refresh request rotates the refresh token.
- Refresh tokens are stored hashed in the database.
- Refresh tokens are tied to a specific session and tenant.

---

# 4. Token Lifecycle

1. User authenticates successfully.
2. Access token is issued.
3. Refresh token is generated using a cryptographically secure random generator.
4. Refresh token hash is stored.
5. Client securely stores the refresh token.
6. Access token expires.
7. Client calls `/api/v1/auth/refresh`.
8. Server validates and rotates the refresh token.
9. New access and refresh tokens are returned.
10. Old refresh token is invalidated.

---

# 5. Refresh Request Validation

Every refresh request validates:

- Refresh token exists
- Hash matches
- Token not expired
- Token not revoked
- Session active
- User active
- Tenant active
- Device policy (if enabled)
- Token version unchanged

Failure returns HTTP 401 with standardized error codes.

---

# 6. Database Model

Suggested table: `refresh_tokens`

Fields:

- id (UUID)
- tenant_id
- user_id
- session_id
- token_hash
- device_id
- issued_at
- expires_at
- revoked_at
- revoked_reason
- last_used_at
- created_at
- updated_at

Indexes:

- tenant_id
- user_id
- session_id
- expires_at

---

# 7. Rotation Strategy

Rotation is mandatory.

Algorithm:

1. Validate current token.
2. Create new refresh token.
3. Persist new token hash.
4. Mark previous token revoked.
5. Issue new access token.
6. Return updated token pair.

Old refresh tokens cannot be reused.

---

# 8. Replay Attack Protection

Replay protection is achieved through:

- One-time-use refresh tokens
- Token rotation
- Session binding
- Device association (optional)
- Revocation timestamps
- Audit logging

If an already-used refresh token is presented, the session may be revoked depending on tenant policy.

---

# 9. Client Storage

## Angular/Web

- Refresh token stored in Secure, HttpOnly, SameSite cookies.
- Never expose to JavaScript.
- Never store in Local Storage or Session Storage.

## Flutter/Mobile

- Store only in `flutter_secure_storage`.
- Never persist in Hive or shared preferences.
- Remove immediately on logout.

---

# 10. Session Relationship

One session owns exactly one active refresh token.

A user may have:

- Single active session (tenant configurable)
- Multiple concurrent sessions (tenant configurable)

Revoking a session revokes its refresh token.

---

# 11. Revocation Events

Refresh tokens are revoked when:

- User logs out
- Administrator forces logout
- Password changes (tenant configurable)
- User disabled
- Tenant disabled
- Suspicious activity detected
- Replay attack detected

---

# 12. API Contract

Endpoint:

POST `/api/v1/auth/refresh`

Request:

- Refresh token (cookie or secure storage transport)

Successful Response:

- New access token
- New refresh token
- Updated expiry
- Session metadata (optional)

---

# 13. Error Codes

- REFRESH-001 Token Missing
- REFRESH-002 Token Invalid
- REFRESH-003 Token Expired
- REFRESH-004 Token Revoked
- REFRESH-005 Session Revoked
- REFRESH-006 Tenant Disabled
- REFRESH-007 User Disabled
- REFRESH-008 Replay Detected

---

# 14. Security Requirements

Mandatory:

- HTTPS only
- Cryptographically secure random generation
- SHA-256/Argon2 hashing for stored token values
- Rate limiting
- CSRF protection for web
- Audit logging
- Secrets stored in OCI Vault

---

# 15. Performance Targets

- Refresh endpoint P95: <200 ms
- Token generation: <50 ms
- Database lookup: <20 ms

---

# 16. Testing Strategy

Unit Tests

- Token generation
- Hash verification
- Rotation logic

Integration Tests

- Login → Refresh → Logout
- Concurrent refresh requests
- Session revocation

Security Tests

- Replay attacks
- Stolen token simulation
- Expired token validation
- Revoked token validation

Load Tests

- High-volume refresh operations
- Concurrent mobile sessions

---

# 17. Acceptance Criteria

- Refresh tokens are opaque.
- Tokens rotate after every use.
- Replay attacks are detected.
- Revoked tokens are rejected.
- Tenant isolation is enforced.
- Sessions remain synchronized.
- Audit events are recorded.
- All automated tests pass.

---

# 18. Dependencies

Depends on:

- Authentication.md
- LoginFlow.md
- JWT.md
- Session Management
- Security Framework
- Multi-Tenant
- OCI Vault

---

# 19. Related Documents

- Authentication.md
- LoginFlow.md
- JWT.md
- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Refresh Token strategy specification for the Enterprise Workforce Platform.
