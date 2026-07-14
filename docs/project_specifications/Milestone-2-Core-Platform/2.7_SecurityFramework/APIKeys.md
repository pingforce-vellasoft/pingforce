# APIKeys.md

# Enterprise Workforce Platform
## Core Platform – Security Module
### API Keys & Service Credentials Specification

**Module:** Core Platform → Security  
**Document:** APIKeys  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design  
**Owner:** Platform Security Architecture Team

---

# 1. Purpose

The API Keys module governs the complete lifecycle of API credentials used by applications, integrations, automation platforms, service accounts and third-party systems that access the Enterprise Workforce Platform.

It provides secure generation, storage, rotation, revocation, auditing and monitoring of API keys while enforcing tenant isolation, RBAC, rate limiting and least-privilege access.

---

# 2. Objectives

The subsystem shall:

- Generate cryptographically secure API keys.
- Support tenant-scoped credentials.
- Support service accounts and integrations.
- Enforce RBAC and Data Scope.
- Rotate and revoke keys safely.
- Monitor usage and detect abuse.
- Support auditability and compliance.

---

# 3. Supported Credential Types

- Public API Key
- Secret API Key
- Service Account Key
- Internal Service Key
- Integration Key
- Webhook Signing Key
- Read-only Key
- Read/Write Key
- Environment-specific Key
- Temporary Key

---

# 4. Key Architecture

Platform
→ Tenant
→ Integration
→ API Key
→ Permissions
→ Usage Policies
→ Audit

Keys are unique and isolated per tenant.

---

# 5. API Key Profile

Each key contains:

- api_key_id (UUID)
- tenant_id
- key_name
- key_prefix
- hashed_secret
- key_type
- owner_user_id
- service_account_id (optional)
- status
- environment
- scopes
- rate_limit
- allowed_ips
- expires_at
- last_used_at
- created_at
- updated_at

Secrets are displayed only once during creation.

---

# 6. Lifecycle

Draft
→ Generated
→ Active
→ Suspended
→ Rotated
→ Revoked
→ Expired
→ Archived

Old keys remain in history for auditing.

---

# 7. Permission Model

Permissions are scope-based:

- attendance.read
- attendance.write
- gps.read
- gps.write
- users.read
- users.write
- reports.export
- settings.read
- settings.write
- audit.read
- integrations.manage

Scopes follow the principle of least privilege.

---

# 8. Authentication Flow

1. Client sends API Key.
2. Gateway validates key.
3. Verify tenant.
4. Verify status.
5. Verify expiration.
6. Verify IP restrictions.
7. Verify scopes.
8. Apply rate limits.
9. Generate audit event.
10. Forward request.

---

# 9. Rotation Policy

Support:

- Manual rotation
- Scheduled rotation
- Forced rotation
- Emergency rotation

Recommended maximum lifetime:

- Production: 90 days
- Sandbox: 180 days

Grace periods are configurable.

---

# 10. Revocation

Reasons:

- Credential compromise
- User termination
- Integration removal
- Tenant suspension
- Key expiration
- Security incident

Revocation immediately invalidates future requests.

---

# 11. Rate Limiting

Configurable:

- Requests/minute
- Requests/hour
- Burst limits
- Concurrent requests
- Daily quota

Policies may vary by tenant and integration.

---

# 12. Network Restrictions

Supported:

- IP allow lists
- CIDR ranges
- Country restrictions (future)
- Private network only (future)

---

# 13. Security Controls

- Secrets hashed or protected by KMS
- TLS 1.2+
- RBAC authorization
- Tenant isolation
- Replay protection
- Request signing (optional)
- Key masking in UI
- Audit logging
- Secret scanning prevention

---

# 14. Monitoring

Track:

- Last used
- Failed authentication
- Usage volume
- Endpoint access
- Geographic origin
- Suspicious behavior
- Rate-limit violations

Alerts generated for anomalies.

---

# 15. Suggested Database Design

Tables:

- api_keys
- api_key_scopes
- api_key_history
- api_key_usage
- api_key_rotation
- api_key_revocation

Indexes:

- tenant_id
- key_prefix
- status
- owner_user_id
- expires_at

---

# 16. REST APIs

GET    /api/v1/security/api-keys

GET    /api/v1/security/api-keys/{id}

POST   /api/v1/security/api-keys

PUT    /api/v1/security/api-keys/{id}

POST   /api/v1/security/api-keys/{id}/rotate

POST   /api/v1/security/api-keys/{id}/revoke

GET    /api/v1/security/api-keys/{id}/usage

---

# 17. Reports

- Active API Keys
- Expiring Keys
- Revoked Keys
- Usage Summary
- Failed Authentication
- Rate Limit Violations
- Integration Activity

---

# 18. Audit Events

- API Key Created
- API Key Viewed
- API Key Rotated
- API Key Revoked
- Scope Updated
- Rate Limit Changed
- Authentication Failed

---

# 19. Error Codes

APIKEY-001 Key Not Found

APIKEY-002 Invalid Key

APIKEY-003 Key Expired

APIKEY-004 Key Revoked

APIKEY-005 Scope Denied

APIKEY-006 Rate Limit Exceeded

APIKEY-007 Unauthorized Operation

---

# 20. Performance Targets

Validation: <10 ms

Scope resolution: <20 ms

Rotation: <2 seconds

Revocation propagation: <30 seconds

---

# 21. Testing Strategy

Functional

- CRUD
- Rotation
- Revocation
- Scope validation
- Usage tracking

Security

- Brute-force attempts
- Replay attacks
- Cross-tenant isolation
- Secret leakage
- Unauthorized access

Performance

- High request volume
- Concurrent validation
- Gateway caching

---

# 22. Future Enhancements

- OAuth2 Client Credentials
- OpenID Connect
- mTLS
- Hardware-backed keys
- AI anomaly detection
- Automatic key rotation
- External KMS integration

---

# 23. Acceptance Criteria

- Secure key generation implemented.
- Rotation and revocation operational.
- Scope-based authorization enforced.
- Usage monitoring available.
- Tenant isolation maintained.
- Audit trail complete.
- Automated tests passing.

---

# 24. Dependencies

- Security.md
- Encryption.md
- AuditLogs.md
- Authentication.md
- RBAC.md
- MultiTenant.md
- Users.md

---

# 25. Related Documents

- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md
- TECH_STACK.md
- BUSINESS_RULES.md
- PRD.md
- PROJECT_VISION.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md

This document is the authoritative API Keys specification for the Enterprise Workforce Platform Security module.
