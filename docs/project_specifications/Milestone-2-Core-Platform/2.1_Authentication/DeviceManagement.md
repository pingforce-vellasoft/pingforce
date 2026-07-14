# DeviceManagement.md

# Enterprise Workforce Platform

## Core Platform – Authentication Module

### Device Management Specification

**Document Version:** 1.0.0  
**Status:** Approved for Detailed Design  
**Module:** Authentication

---

# 1. Purpose

The Device Management subsystem manages every device that authenticates against the Enterprise Workforce Platform.

Its objectives are to:

- Identify trusted and untrusted devices
- Associate sessions with physical devices
- Detect suspicious device activity
- Allow administrators and users to manage active devices
- Improve security without degrading usability

Device Management integrates with:

- Authentication
- Login Flow
- JWT
- Refresh Token
- Session Management
- OTP
- Future MFA
- Security Framework
- Audit Logging

---

# 2. Business Objectives

The subsystem shall:

- Register authenticated devices
- Associate every login with a device
- Detect unknown devices
- Support trusted devices
- Allow remote device logout
- Record complete device history
- Support tenant-specific security policies

---

# 3. Supported Platforms

- Angular Web
- Flutter Android
- Flutter iOS
- REST API Clients
- Future Desktop Client

---

# 4. Device Lifecycle

1. Device detected
2. Device fingerprint generated
3. Login initiated
4. Authentication succeeds
5. Device registered
6. Session created
7. Device becomes Active
8. Activity monitored
9. Device trusted (optional)
10. Device revoked or removed

---

# 5. Device States

- New
- Pending Verification
- Active
- Trusted
- Suspended
- Revoked
- Deleted

Only Active and Trusted devices may maintain authenticated sessions.

---

# 6. Device Fingerprint

Each device record may contain:

- Device ID
- Device Name
- Device Type
- Operating System
- OS Version
- Browser
- Browser Version
- Application Version
- Manufacturer
- Model
- Screen Resolution (Web)
- Locale
- Time Zone
- Push Notification Token
- Last Known IP

Fingerprint generation should balance security and privacy. Personally identifiable hardware identifiers must not be collected unless required and permitted by policy.

---

# 7. Device Registration

Registration occurs after successful authentication.

Captured information:

- tenant_id
- user_id
- session_id
- device metadata
- first_login_at
- last_login_at
- last_activity_at

Duplicate registrations should update existing records rather than creating unnecessary duplicates.

---

# 8. Trusted Devices

Tenant administrators may enable trusted devices.

Benefits:

- Reduced OTP prompts
- Longer session lifetime
- Lower fraud risk score

Trusted status may expire automatically after a configurable period.

---

# 9. Device Verification

Verification methods:

- Email OTP
- SMS OTP (future)
- Authenticator App (future)
- Administrator Approval (optional)

High-risk logins from unknown devices may require verification before granting access.

---

# 10. Device Policies

Configurable per tenant:

- Maximum devices per user
- Trusted device expiry
- Device inactivity cleanup
- Mandatory verification
- Device naming rules
- Allowed operating systems
- Minimum application version

---

# 11. Device Inventory

Suggested database table:

device_registry

Columns:

- id
- tenant_id
- user_id
- device_uuid
- device_name
- platform
- os_name
- os_version
- app_version
- browser
- browser_version
- push_token
- trust_status
- first_login_at
- last_login_at
- last_activity_at
- revoked_at
- created_at
- updated_at

Recommended indexes:

- tenant_id
- user_id
- device_uuid
- trust_status

---

# 12. Device Security

Mandatory controls:

- Device linked to session
- Device linked to refresh token
- Refresh token rotation
- Tenant isolation
- Audit logging
- Rate limiting
- HTTPS only

Future enhancements:

- Device risk score
- Jailbreak / Root detection
- Emulator detection
- SafetyNet / Play Integrity
- Apple DeviceCheck

---

# 13. Device Management APIs

GET /api/v1/auth/devices

GET /api/v1/auth/devices/{id}

DELETE /api/v1/auth/devices/{id}

POST /api/v1/auth/devices/{id}/trust

POST /api/v1/auth/devices/{id}/revoke

POST /api/v1/auth/devices/revoke-all

---

# 14. User Features

Users can:

- View active devices
- Rename devices
- Remove devices
- Revoke sessions
- Trust devices (tenant policy)

---

# 15. Administrator Features

Tenant Administrators can:

- Search devices
- Revoke compromised devices
- Force logout
- View device history
- Configure device policies

Platform Super Administrators have global visibility subject to platform governance.

---

# 16. Audit Events

Audit:

- Device Registered
- Device Verified
- Device Trusted
- Device Revoked
- Device Removed
- Device Policy Changed
- Suspicious Device Detected

Every event records:

- tenant_id
- user_id
- session_id
- device_id
- IP
- timestamp
- correlation_id

---

# 17. Error Codes

DEVICE-001 Device Not Found

DEVICE-002 Device Revoked

DEVICE-003 Device Verification Required

DEVICE-004 Device Limit Exceeded

DEVICE-005 Unsupported Device

DEVICE-006 App Version Unsupported

---

# 18. Performance Targets

- Device lookup <20 ms
- Registration <100 ms
- Device list <300 ms
- Revocation <100 ms

---

# 19. Testing Strategy

Unit:

- Fingerprint generation
- Trust policy
- Registration

Integration:

- Login with new device
- Login with trusted device
- Device revocation

Security:

- Device spoofing
- Replay
- Session hijacking
- Rooted device handling (future)

Load:

- Thousands of concurrent devices
- Mass revocation

---

# 20. Acceptance Criteria

- Device registered after login
- Trusted device policy enforced
- Unknown device verification supported
- Device inventory maintained
- Remote revocation works
- Audit history complete
- Tenant isolation enforced
- Automated tests passing

---

# 21. Dependencies

- Authentication.md
- LoginFlow.md
- JWT.md
- RefreshToken.md
- SessionManagement.md
- OTP.md
- Security Framework
- Multi-Tenant

---

# 22. Related Documents

- BUSINESS_RULES.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Device Management specification for the Authentication module.
