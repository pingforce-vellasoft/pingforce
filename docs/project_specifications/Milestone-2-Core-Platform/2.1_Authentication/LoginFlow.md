# LoginFlow.md

# Enterprise Workforce Platform

## Authentication Module – Login Flow Specification

**Module:** Core Platform → Authentication  
**Document:** Login Flow  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design

---

# 1. Purpose

This document defines the end-to-end login flow for all authentication entry points in the Enterprise Workforce Platform.

It specifies:

- Business workflow
- Validation sequence
- Security controls
- Tenant resolution
- JWT issuance
- Session creation
- Failure scenarios
- Audit requirements

This specification applies to:

- Angular Admin Portal
- Flutter Mobile Application
- Public REST APIs
- Future Desktop Client
- Future Partner APIs

---

# 2. Business Objectives

The login process shall:

- Verify user identity securely.
- Resolve the correct tenant.
- Prevent unauthorized access.
- Establish a trusted session.
- Issue secure JWT access and refresh tokens.
- Record every authentication event.
- Integrate seamlessly with RBAC and Multi-Tenant modules.

---

# 3. Actors

- Platform Super Administrator
- Tenant Administrator
- Manager
- Employee
- Field Staff
- Client User
- Authentication Service
- Tenant Resolver
- RBAC Service
- Audit Service

---

# 4. High-Level Login Flow

```text
User
  │
  ▼
Login Screen
  │
  ▼
Input Validation
  │
  ▼
Tenant Resolution
  │
  ▼
Account Lookup
  │
  ▼
Password Verification
  │
  ▼
Account Status Validation
  │
  ▼
Permission & Tenant Validation
  │
  ▼
JWT Generation
  │
  ▼
Refresh Token Generation
  │
  ▼
Session Creation
  │
  ▼
Audit Logging
  │
  ▼
Login Success Response
```

---

# 5. Detailed Authentication Sequence

## Step 1 – Client Request

The client submits:

- Username / Email / Mobile (tenant configurable)
- Password
- Tenant identifier (subdomain, tenant code or JWT context)
- Device metadata
- Application version

Validation:

- Mandatory fields
- Input format
- Request size
- TLS required

---

## Step 2 – Tenant Resolution

Resolution priority:

1. Custom domain
2. Tenant code
3. Platform selection
4. Existing trusted context

Validation:

- Tenant exists
- Tenant active
- Subscription valid (future)
- Module enabled

Failure returns:

AUTH-005 Tenant Disabled or Invalid Tenant.

---

## Step 3 – User Lookup

Search user within resolved tenant only.

Rules:

- Cross-tenant lookup prohibited.
- Deleted accounts ignored.
- Soft-deleted users cannot authenticate.

---

## Step 4 – Password Verification

Password comparison uses secure hashing:

- Argon2 (preferred)
- BCrypt (supported)

Rules:

- Constant-time comparison
- Never log plaintext passwords
- Never expose hash values

---

## Step 5 – Account Validation

Verify:

- Active status
- Password not expired
- Lockout threshold
- Suspension
- Disabled state

Possible outcomes:

- Success
- Locked
- Suspended
- Disabled
- Password Expired

---

## Step 6 – RBAC Preparation

Authentication retrieves:

- User ID
- Tenant ID
- Assigned roles
- Permission checksum
- Department
- Reporting hierarchy (optional)

Authorization decisions occur after authentication.

---

## Step 7 – Token Generation

### Access Token

Claims:

- sub
- tenant_id
- user_id
- roles
- issued_at
- expiry
- token_version

Lifetime:

15–30 minutes (tenant configurable).

### Refresh Token

Characteristics:

- Opaque
- Rotated after use
- Revocable
- Stored securely

---

## Step 8 – Session Creation

Store:

- Device ID
- Browser / App version
- IP address
- Login timestamp
- Refresh token identifier
- Session expiry

Concurrent session policy is tenant configurable.

---

## Step 9 – Audit Logging

Mandatory audit event:

- Login Success
- Login Failure
- Lockout
- Password Expired
- Refresh Issued

Each event records:

- Tenant
- User
- Device
- IP
- Timestamp
- Correlation ID

---

# 6. Login Success Response

Response includes:

- Access Token
- Refresh Token
- User Profile
- Tenant Profile
- Branding metadata
- Feature flags
- Session expiration
- Password expiry warning (if applicable)

Passwords or permission internals are never returned.

---

# 7. Login Failure Scenarios

| Error    | Description         |
| -------- | ------------------- |
| AUTH-001 | Invalid credentials |
| AUTH-002 | Account locked      |
| AUTH-003 | Account disabled    |
| AUTH-004 | Password expired    |
| AUTH-005 | Tenant unavailable  |
| AUTH-006 | Invalid token       |
| AUTH-008 | Too many attempts   |

Responses must not disclose whether the username exists.

---

# 8. Brute Force Protection

Rules:

- Failed login counter
- Progressive delay
- CAPTCHA after configurable failures
- Temporary lockout
- Permanent administrative lock when required

---

# 9. Security Controls

Mandatory controls:

- HTTPS only
- HSTS
- Secure cookies (web)
- Device fingerprint (future)
- Rate limiting
- CSRF protection (web)
- Input validation
- Audit logging
- Secrets in OCI Vault

Reference standards:

- OWASP ASVS
- OWASP Top 10

---

# 10. Mobile Login

Additional requirements:

- Secure storage for refresh tokens
- Biometric unlock (future)
- Offline mode never bypasses authentication
- Device permission validation

---

# 11. Web Login

Requirements:

- Angular route guards
- Session timeout handling
- Silent refresh
- Automatic logout after inactivity
- Tenant branding applied before login

---

# 12. Performance Targets

- Login API (P95): <500 ms
- Token refresh: <200 ms
- JWT validation: <50 ms

---

# 13. Test Scenarios

Positive:

- Valid login
- Refresh token rotation
- Concurrent sessions
- Password change

Negative:

- Invalid password
- Invalid tenant
- Locked account
- Expired password
- Disabled account
- SQL injection attempt
- Brute-force simulation

---

# 14. Acceptance Criteria

A login implementation is complete only when:

- Identity verified securely
- Tenant resolved correctly
- JWT issued
- Refresh token stored
- Session created
- Audit recorded
- RBAC context available
- Security controls validated
- Automated tests passing

---

# 15. Dependencies

Depends on:

- Authentication.md
- Multi-Tenant
- RBAC
- User Management
- Security Framework
- Audit Logging

---

# 16. Related Documents

- Authentication.md
- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative login workflow specification for the Enterprise Workforce Platform Authentication module.
