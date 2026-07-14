# LoginHistory.md

# Enterprise Workforce Platform
## Core Platform – Security Module
### Login History & Authentication Activity Specification

**Module:** Core Platform → Security
**Document:** LoginHistory
**Version:** 1.0.0
**Status:** Approved for Detailed Design
**Owner:** Platform Security Architecture Team

---

# 1. Purpose

The Login History module records every authentication attempt and session lifecycle event across the Enterprise Workforce Platform. It provides a complete, immutable history of successful and failed logins for employees, managers, customer users, tenant administrators, platform administrators, service accounts and API clients.

The module supports security investigations, compliance reporting, user self-service, anomaly detection and operational monitoring.

---

# 2. Objectives

The subsystem shall:

- Record every authentication attempt.
- Track session creation and termination.
- Detect suspicious login behavior.
- Support tenant-aware reporting.
- Integrate with Audit Logs and Authentication.
- Provide searchable login history.
- Support configurable retention policies.

---

# 3. Scope

Tracks:

- Username/password login
- Email OTP
- Mobile OTP
- MFA verification
- SSO (future)
- Refresh token usage
- Session expiry
- Logout
- Forced logout
- Device registration
- Token revocation

---

# 4. Login Lifecycle

Login Request
→ Credential Validation
→ MFA (if required)
→ Session Creation
→ Access Granted
→ Activity Tracking
→ Logout / Timeout / Revocation
→ Archive

Every step is logged.

---

# 5. Login Record Structure

Each record contains:

- login_history_id
- tenant_id
- company_id
- user_id
- employee_id
- username
- authentication_method
- outcome
- failure_reason
- login_timestamp_utc
- logout_timestamp_utc
- session_id
- refresh_token_id
- device_id
- device_name
- device_type
- operating_system
- browser
- app_version
- ip_address
- geo_location
- network_type
- correlation_id

---

# 6. Authentication Methods

Supported:

- Username & Password
- Email OTP
- Mobile OTP
- JWT
- Refresh Token
- API Key
- Service Account
- SSO (future)
- Passkeys/WebAuthn (future)

---

# 7. Login Outcomes

- Success
- Invalid Password
- Invalid Username
- Account Locked
- Account Suspended
- MFA Failed
- OTP Expired
- Session Expired
- Device Blocked
- Tenant Disabled
- Permission Denied

---

# 8. Session Integration

Associated events:

- Session Created
- Session Refreshed
- Session Expired
- Session Revoked
- Logout
- Forced Logout
- Idle Timeout

Integrated with SessionManagement.md.

---

# 9. Device Tracking

Capture:

- Device Fingerprint
- Device Identifier
- Trusted Device Status
- Emulator Detection
- Root/Jailbreak Status
- Browser Fingerprint
- Last Known Location

---

# 10. Security Controls

- Tenant isolation
- RBAC authorization
- Data Scope filtering
- Immutable records
- Encryption at rest
- TLS in transit
- PII masking where applicable
- Audit every access to login history

---

# 11. Threat Detection

Generate alerts for:

- Brute-force attacks
- Impossible travel
- Multiple failed logins
- Multiple countries
- New device
- New browser
- Suspicious IP
- Token replay
- Excessive session creation

---

# 12. Data Retention

Configurable:

- 90 Days
- 180 Days
- 1 Year
- 3 Years
- 7 Years

Archived records remain searchable.

---

# 13. Suggested Database Design

Tables:

- login_history
- login_failures
- session_history
- device_history
- authentication_events

Indexes:

- tenant_id
- user_id
- session_id
- login_timestamp_utc
- outcome
- ip_address

Partition monthly for scalability.

---

# 14. REST APIs

GET    /api/v1/security/login-history

GET    /api/v1/security/login-history/{id}

GET    /api/v1/security/login-history/user/{userId}

GET    /api/v1/security/login-history/session/{sessionId}

POST   /api/v1/security/login-history/search

GET    /api/v1/security/login-history/export

---

# 15. Reports

- User Login History
- Failed Login Summary
- Device Login History
- Active Sessions
- Country-wise Logins
- Browser Statistics
- Authentication Success Rate
- Security Incidents

---

# 16. Dashboards

Widgets:

- Active Sessions
- Failed Logins
- MFA Adoption
- Login Trends
- New Devices
- Geographic Login Map
- Top Locked Accounts

---

# 17. Audit Events

- Login Recorded
- Login History Viewed
- Login History Exported
- Session Revoked
- Device Flagged
- Security Alert Triggered

---

# 18. Error Codes

LOGIN-001 Login Record Not Found

LOGIN-002 Unauthorized Access

LOGIN-003 Session Not Found

LOGIN-004 Export Failed

LOGIN-005 Invalid Filter

LOGIN-006 Retention Policy Violation

---

# 19. Performance Targets

Record write: <20 ms

User history lookup: <100 ms

Search: <300 ms

Dashboard: <250 ms

---

# 20. Testing Strategy

Functional

- Successful login
- Failed login
- MFA flow
- Session lifecycle
- Export

Security

- Cross-tenant isolation
- Unauthorized access
- PII masking
- Audit integrity

Performance

- Millions of login events
- Concurrent authentication
- Large exports

---

# 21. Future Enhancements

- AI anomaly detection
- Risk-based authentication
- Behavioral analytics
- Live login monitoring
- SIEM integration
- Identity timeline visualization

---

# 22. Acceptance Criteria

- All login events recorded.
- Session lifecycle tracked.
- Reports available.
- Tenant isolation enforced.
- Audit trail complete.
- Automated tests passing.

---

# 23. Dependencies

- Authentication.md
- JWT.md
- RefreshToken.md
- SessionManagement.md
- DeviceManagement.md
- AuditLogs.md
- Encryption.md
- Security.md
- RBAC.md
- Users.md

---

# 24. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- BUSINESS_RULES.md
- PROJECT_VISION.md
- PRD.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md

This document is the authoritative Login History specification for the Enterprise Workforce Platform Security module.
