# JWT.md

# Enterprise Workforce Platform
## Authentication Module – JWT Token Strategy & Specification

**Module:** Core Platform → Authentication
**Document:** JWT Strategy
**Version:** 1.0.0
**Status:** Approved for Architecture & Detailed Design
**Owner:** Platform Architecture Team

---

# 1. Purpose

This document defines the complete JSON Web Token (JWT) strategy for the Enterprise Workforce Platform.

It standardizes:

- JWT structure
- Access token lifecycle
- Refresh token relationship
- Claims
- Signing algorithms
- Validation rules
- Revocation strategy
- Multi-tenant behavior
- Security requirements
- Performance considerations

This specification applies to:

- Angular Admin Portal
- Flutter Mobile Application
- NestJS APIs
- Background Services
- Future Partner APIs

---

# 2. Design Goals

The JWT implementation shall:

- Be stateless for API authorization.
- Support multi-tenant SaaS.
- Minimize database lookups.
- Prevent token tampering.
- Enable token revocation through versioning.
- Support horizontal scaling.
- Be compatible with future SSO and MFA.

---

# 3. Token Types

## Access Token

Purpose:
- Authenticate API requests.

Characteristics:

- JWT
- Short-lived
- Signed
- Self-contained
- Sent in Authorization header

Lifetime:

15–30 minutes (tenant configurable).

---

## Refresh Token

Purpose:

Obtain a new access token without forcing the user to log in again.

Characteristics:

- Opaque random value
- Stored hashed in database
- Rotated on every use
- Revocable
- Bound to session

Lifetime:

7–30 days (tenant configurable).

---

# 4. JWT Claims

Mandatory claims:

- iss (issuer)
- aud (audience)
- sub (user identifier)
- tenant_id
- session_id
- roles
- token_version
- iat
- nbf
- exp
- jti

Optional claims:

- locale
- timezone
- department_id
- employee_code

Sensitive data such as passwords, secrets, or full permission matrices must never be stored in JWTs.

---

# 5. Signing Strategy

Approved algorithm:

- RS256 (preferred)

Alternative:

- ES256 (future)

HS256 is not approved for production.

Private signing keys are stored in OCI Vault.

Public keys are exposed internally for verification.

---

# 6. Token Issuance Flow

1. User successfully authenticates.
2. Tenant is resolved.
3. Account state validated.
4. Roles loaded.
5. JWT claims assembled.
6. Token signed.
7. Refresh token generated.
8. Session persisted.
9. Audit event recorded.
10. Response returned.

---

# 7. Validation Rules

Every protected request validates:

- Signature
- Expiration
- Not-before time
- Issuer
- Audience
- Token version
- Tenant status
- User status
- Session status (when required)

Invalid tokens return HTTP 401.

---

# 8. Revocation Strategy

A JWT cannot be directly revoked.

Revocation is achieved through:

- Session revocation
- Refresh token deletion
- Token version increment
- User disablement
- Tenant disablement

Any mismatch invalidates future access.

---

# 9. Multi-Tenant Rules

Every JWT contains exactly one tenant_id.

Rules:

- Cross-tenant access prohibited.
- Token cannot be reused across tenants.
- Super Administrator receives platform scope through dedicated claims, never by omitting tenant validation.

---

# 10. Storage Guidelines

Web:

- Access token in memory.
- Refresh token in secure HttpOnly cookie.

Mobile:

- Refresh token in flutter_secure_storage.
- Access token in memory only.

Tokens must never be stored in Local Storage.

---

# 11. Renewal Strategy

Before access token expiry:

1. Client requests refresh.
2. Refresh token validated.
3. Existing refresh token revoked.
4. New access token issued.
5. New refresh token issued.
6. Session updated.
7. Audit event recorded.

---

# 12. Logout Behaviour

Logout:

- Deletes refresh token
- Revokes active session
- Invalidates future refresh requests
- Records audit log

Expired access tokens naturally become unusable.

---

# 13. Security Controls

Mandatory:

- HTTPS only
- Short-lived access tokens
- Rotation of refresh tokens
- Replay protection using jti
- Rate limiting
- Audit logging
- Clock skew tolerance (≤60 seconds)
- Secrets managed in OCI Vault

---

# 14. Error Codes

JWT-001 Invalid Signature

JWT-002 Token Expired

JWT-003 Invalid Audience

JWT-004 Invalid Issuer

JWT-005 Token Revoked

JWT-006 Invalid Tenant

JWT-007 Session Invalid

JWT-008 Token Version Mismatch

---

# 15. Performance Targets

- JWT verification < 20 ms
- Refresh flow < 200 ms
- Token generation < 50 ms

---

# 16. Testing Strategy

Unit Tests:

- Claim generation
- Signature validation
- Expiry logic

Integration Tests:

- Login
- Refresh
- Logout
- Revocation

Security Tests:

- Tampering
- Replay attacks
- Expired tokens
- Invalid signatures

Load Tests:

- Concurrent validation
- High-volume refresh requests

---

# 17. Best Practices

- Keep claims minimal.
- Never trust client-modified tokens.
- Always validate signature before claims.
- Rotate signing keys using a managed key lifecycle.
- Use correlation IDs for audit tracing.

---

# 18. Acceptance Criteria

- JWT signed with approved algorithm.
- Claims validated.
- Tenant isolation enforced.
- Refresh rotation operational.
- Revocation strategy implemented.
- Audit logs generated.
- Automated tests passing.

---

# 19. Dependencies

Depends on:

- Authentication.md
- LoginFlow.md
- Multi-Tenant
- RBAC
- Security Framework
- OCI Vault

---

# 20. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- Authentication.md
- LoginFlow.md
- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md

This document is the authoritative JWT strategy specification for the Enterprise Workforce Platform.
