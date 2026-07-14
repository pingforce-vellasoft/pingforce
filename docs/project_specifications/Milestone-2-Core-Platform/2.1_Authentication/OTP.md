# OTP.md

# Enterprise Workforce Platform
## Authentication Module – One-Time Password (OTP) Specification

**Module:** Core Platform → Authentication  
**Document:** OTP Strategy & Functional Specification  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design

---

# 1. Purpose

This document defines the architecture, business rules, security requirements, APIs, lifecycle, and implementation guidelines for One-Time Password (OTP) authentication.

OTP is designed as an **additional verification factor** for sensitive operations. It complements the primary username/password authentication flow and provides a foundation for future Multi-Factor Authentication (MFA).

Supported use cases include:

- Login verification (future MFA)
- Forgot password
- Password reset confirmation
- New device verification
- Email verification
- Mobile number verification
- Sensitive profile changes
- High-risk administrative actions

---

# 2. Objectives

The OTP subsystem shall:

- Generate cryptographically secure OTPs.
- Support Email and SMS delivery.
- Support TOTP-based MFA in future.
- Prevent replay attacks.
- Enforce expiration.
- Limit retry attempts.
- Record complete audit history.
- Operate in a multi-tenant environment.

---

# 3. Supported OTP Types

| Type | Status | Usage |
|------|--------|------|
| Email OTP | Supported | Login, password reset, verification |
| SMS OTP | Planned | Login, mobile verification |
| Authenticator App (TOTP) | Planned | MFA |
| Voice OTP | Future | Accessibility |

---

# 4. Business Rules

### BR-OTP-001
Each OTP is associated with exactly one:
- Tenant
- User (or pending user)
- Purpose
- Channel

### BR-OTP-002
An OTP is valid for a single successful verification only.

### BR-OTP-003
Expired OTPs cannot be reused.

### BR-OTP-004
Maximum verification attempts are tenant configurable.

### BR-OTP-005
OTP generation and verification events are audited.

---

# 5. OTP Lifecycle

1. User initiates an OTP-required action.
2. System validates eligibility.
3. Secure OTP is generated.
4. OTP is hashed before persistence.
5. OTP is delivered through the selected channel.
6. User submits the OTP.
7. OTP is validated.
8. OTP is marked as consumed.
9. Audit event is recorded.

---

# 6. Generation Rules

Recommended length:
- Default: 6 digits
- Configurable: 4–8 digits

Generation requirements:
- Cryptographically secure RNG
- No sequential values
- No predictable patterns
- No reuse within active validity window

---

# 7. Expiration Policy

Default validity:
- Email OTP: 10 minutes
- SMS OTP: 5 minutes
- TOTP: 30 seconds (future)

Expired OTPs are automatically rejected.

---

# 8. Retry Policy

Default limits:
- Verification attempts: 5
- Resend requests: 3
- Cool-down between resends: 60 seconds

Exceeding limits may temporarily block further requests.

---

# 9. Storage Strategy

OTP values are **never stored in plaintext**.

Persist only:
- otp_hash
- tenant_id
- user_id
- purpose
- delivery_channel
- created_at
- expires_at
- consumed_at
- failed_attempts
- request_ip
- device_id

Hashing recommendation:
- SHA-256 or Argon2 depending on storage strategy.

---

# 10. Delivery Channels

## Email

Provider:
- SMTP
- Enterprise Email Service

Template variables:
- OTP
- Expiry time
- Tenant branding
- Support contact

## SMS

Future integration:
- SMS Gateway
- Country-aware routing
- Delivery status tracking

---

# 11. API Endpoints

POST /api/v1/auth/otp/request

POST /api/v1/auth/otp/verify

POST /api/v1/auth/otp/resend

GET /api/v1/auth/otp/status (internal)

---

# 12. Validation Flow

Server validates:

- Tenant
- User state
- OTP existence
- Expiration
- Retry count
- Hash match
- Purpose
- Consumption state

Successful validation consumes the OTP immediately.

---

# 13. Security Controls

Mandatory controls:

- HTTPS only
- Rate limiting
- OTP hashing
- Replay prevention
- One-time use
- Brute-force detection
- Correlation IDs
- Audit logging
- Tenant isolation
- Secrets managed in OCI Vault

Reference:
- OWASP ASVS
- OWASP Authentication Cheat Sheet

---

# 14. Error Codes

OTP-001 Invalid OTP

OTP-002 OTP Expired

OTP-003 OTP Already Used

OTP-004 Too Many Attempts

OTP-005 Resend Limit Exceeded

OTP-006 Invalid Purpose

OTP-007 Tenant Disabled

OTP-008 User Disabled

---

# 15. Performance Targets

- OTP generation: <50 ms
- Verification: <150 ms
- Email dispatch request: <300 ms
- OTP lookup: <20 ms

---

# 16. Audit Events

Audit the following:

- OTP Requested
- OTP Delivered
- OTP Delivery Failed
- OTP Verified
- OTP Verification Failed
- OTP Expired
- OTP Resent

Audit records include:
- tenant_id
- user_id
- request_id
- ip_address
- device_id
- timestamp

---

# 17. Test Strategy

Unit Tests
- Generation
- Hashing
- Expiry
- Retry logic

Integration Tests
- Request → Verify
- Request → Resend → Verify
- Password reset with OTP

Security Tests
- Replay attack
- Brute-force simulation
- Expired OTP
- Invalid tenant
- Invalid purpose

Load Tests
- Concurrent OTP generation
- Bulk verification

---

# 18. Future Enhancements

- TOTP (RFC 6238)
- Push-based approval
- Device trust scoring
- Risk-based authentication
- Adaptive MFA
- WebAuthn / Passkeys

---

# 19. Acceptance Criteria

- Secure OTP generation implemented.
- OTP stored only as hash.
- Expiration enforced.
- Retry policy enforced.
- Replay attacks prevented.
- Tenant isolation maintained.
- Audit events generated.
- Automated tests passing.

---

# 20. Dependencies

- Authentication.md
- LoginFlow.md
- JWT.md
- RefreshToken.md
- Notification Engine
- User Management
- Security Framework

---

# 21. Related Documents

- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative OTP specification for the Enterprise Workforce Platform Authentication module.
