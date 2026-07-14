# Phase 2 — Markdown Spec Coverage Review

**Date:** 2026-07-14
**Purpose:** Double-check of ALL markdown files relevant to Phase 2 (compliance & platform plumbing) against what was actually implemented. Draft only — the "Remaining vs spec" columns are the backlog for Phase 2b/3.

Legend: ✅ implemented per spec · 🟡 core implemented, spec extras remain · ⏸ deliberately deferred · ❌ not started

---

## 1. Specs USED as implementation reference in Phase 2

### 2.1_Authentication/OTP.md — 🟡
| Spec requirement | Status |
|---|---|
| CSPRNG 6-digit generation (§6) | ✅ `crypto.randomInt` |
| Hash-only storage (§9) | ✅ SHA-256 in `otp` column |
| 10-min email expiry (§7) | ✅ |
| 5 verify attempts / 3 resends / 60s cooldown (§8) | ✅ |
| Single-use, atomic consumption (BR-OTP-002/003) | ✅ `updateMany` guard |
| Audit events (§16) | ✅ requested/verified/failed |
| Error codes OTP-001…005 (§14) | ✅ |
| **Remaining vs spec:** SMS channel (§10), TOTP/MFA (§18), tenant-configurable lengths/attempts (§6, BR-OTP-004), dedicated `/auth/otp/request|verify|resend` endpoints (§11 — currently embedded in password-reset flow only), device_id/request_ip persisted on OTP rows | Phase 2b |

### 2.1_Authentication/SessionManagement.md — 🟡
| Spec requirement | Status |
|---|---|
| Session created on login with metadata (§6) | ✅ device, platform, IP, UA |
| Session states active/revoked/expired (§5) | ✅ (revokedAt/expiresAt; no separate Idle state) |
| Forced logout / revocation (§2) | ✅ revoke, logout, logout-all |
| lastActivityAt tracking (§7) | ✅ touched on refresh |
| Audit of session lifecycle | ✅ SESSION_CREATED/REVOKED/ALL_SESSIONS_REVOKED |
| **Remaining vs spec:** idle-timeout policy per tenant (§8), concurrent-session limits, suspicious-activity detection, session listing for admins (currently self-service only) | Phase 2b/3 |

### 2.1_Authentication/RefreshToken.md — 🟡
| Spec requirement | Status |
|---|---|
| Rotation on every refresh (§7) | ✅ revoke-not-delete with reason ROTATED |
| Replay detection → session kill (§8) | ✅ revoked-token reuse → revoke all + tokenVersion bump + CRITICAL audit |
| Session binding (§6 session_id) | ✅ `sessionId` column + validity check |
| lastUsedAt, revoked_reason (§6) | ✅ |
| **Deviation:** spec §3 says refresh tokens must be *opaque random values, never JWTs* — current implementation signs a JWT and stores its `jti`. Functionally rotated+hashed-equivalent, but non-conformant. Refactor in Phase 3. |
| **Remaining vs spec:** tenant-configurable lifetimes (7–30d), device-policy validation, SYSTEM (super-admin) refresh tokens still not persisted/revocable | Phase 3 |

### 2.7_SecurityFramework/AuditLogs.md — 🟡
| Spec requirement | Status |
|---|---|
| Every mutation recorded (§4) | ✅ global interceptor |
| Record structure (§5) | 🟡 core fields (tenant, actor, module, entity, action, outcome, severity, request_id, ip, user_agent, device_id, old/new value) — missing company_id, employee_id, session_id, location |
| Tenant isolation + RBAC on access (§9) | ✅ AUDIT:READ permission |
| Audit access is audited (§16) | ✅ AUDIT_VIEWED |
| Search & filtering (§8) | ✅ module/severity/actor/date/requestId/outcome |
| Append-only (§3) | ✅ no update/delete API |
| **Remaining vs spec:** export API + background job (§13), retention policies (§7), archive tables/partitioning (§12), hash-chain integrity (§10), alerting on critical events (§15), correlation endpoint | Phase 3+ |

### 2.2_RBAC/DataScope.md — 🟡
| Spec requirement | Status |
|---|---|
| Scope resolution per permission (§6) | ✅ `getDataScope()` |
| Deny by default (§6) | ✅ null scope → empty result |
| SELF/TEAM/TENANT filters (§7) | ✅ OWN/TEAM/BRANCH/ALL via `buildEmployeeScopeFilter()` |
| Applied to queries | 🟡 leave pending + claims pending only |
| **Remaining vs spec:** apply to ALL list endpoints (attendance logs, faults, leads, employees, reports §1), DEPARTMENT/REGION/BUSINESS_UNIT/CUSTOM scopes (§4), indirect reports in TEAM (§8 hierarchy), scope decision auditing (§6.9) | Phase 3 — roll out with repository refactor |

### 2.8_NotificationEngine/Email.md — 🟡
| Spec requirement | Status |
|---|---|
| SMTP provider (§5) | ✅ nodemailer, env-gated, graceful fallback |
| Template compile + delivery log lifecycle | ✅ PENDING→SENT/FAILED in NotificationLog |
| Recipient resolution | ✅ userId → email |
| **Remaining vs spec:** per-tenant provider config (§5), retries/failover (§2), scheduling, localization, user preferences, branded templates, queue-based dispatch (§4 — should become a BullMQ consumer), delivery webhooks | Phase 2b |

### .agents/AGENTS.md — applied
Tenant isolation, audit trails on sensitive ops, structured logging with correlation IDs, conventional commits, no hardcoded secrets. (Kafka guidance ignored per explicit no-Kafka decision — BullMQ/EventBus instead.)

---

## 2. Specs RELEVANT to Phase 2 but NOT yet used → backlog

| Spec | Why relevant | Status / action |
|---|---|---|
| 2.1/Authentication.md | Umbrella auth spec — password policy §5 (min 12, complexity, history), change-password, temporary passwords, lockout | ❌ password policy not enforced (ConfirmPasswordResetDto only requires 8 chars — **below spec minimum 12**); no change-password endpoint; no lockout. → Phase 2b priority |
| 2.1/LoginFlow.md | Canonical login sequence incl. audit of every failure branch | 🟡 implemented flow matches; failed-login audit only on bad password (not unknown-user/inactive branches); no lockout counter |
| 2.1/JWT.md | Claims contract | 🟡 has sub/tenant_id/session_id(sid)/role/token_version/exp/iat; **missing iss, aud, nbf claims + validation**; jti only on refresh. → small Phase 2b fix |
| 2.1/DeviceManagement.md | Trusted devices, device verification OTP | ⏸ partial overlap with attendance EmployeeDevice; full lifecycle → Phase 3 |
| 2.7/LoginHistory.md | Dedicated login_history table + self-service "my logins" | ❌ currently approximated via AuditLog LOGIN events; dedicated model + APIs → Phase 2b |
| 2.7/PasswordPolicy.md | Complexity/history/lockout/breach-check | ❌ → Phase 2b together with Authentication.md §5 |
| 2.7/Encryption.md | At-rest/in-transit, key mgmt via OCI Vault | 🟡 argon2 + RS256 conform (§8, §9); field-level encryption + Vault integration → infra phase |
| 2.7/APIKeys.md | Service credentials | ❌ no consumers yet → later milestone |
| 2.7/DeviceSecurity.md | Device trust, attestation | ❌ note: Flutter still sends fake `X-Device-Attestation` header — remove/implement in Phase 5 |
| 2.8/Push.md | FCM push, DeviceToken model exists unused | ⏸ deferred (needs Firebase credentials) → Phase 2b |
| 2.8/Templates.md | Template versioning/localization/approval | 🟡 basic {{var}} engine only |
| 2.8/InApp.md | Notification center + real-time | ❌ → with mobile/admin work (Phase 5) |
| 2.8/WhatsApp.md | WhatsApp channel | ❌ explicitly last per plan |
| 2.9/Storage.md + Upload.md | OCI Object Storage, real bytes, MIME/size validation | ⏸ deferred (needs OCI credentials/SDK) → Phase 2b. Note: unauthenticated `/api/v1/uploads` static serving + unvalidated base64 logo write still open from audit |
| 2.9/Images.md, Documents.md, DigitalSignature.md | Depend on Storage.md | ❌ follow storage |
| 2.2/RBAC.md, Roles.md, Permissions.md, PermissionMatrix.md | Core RBAC | ✅ satisfied by Phase 0 catalog + guard (evaluation order §3 partially — no menu/screen/field layers) |
| 2.2/MenuPermissions.md, ScreenPermissions.md, FieldPermissions.md | UI + field-level authorization | ❌ → Phase 5 (frontend) + Phase 3 (field masking API-side) |

---

## 3. Corrections queued from this review (small, concrete)

1. ✅ DONE — **Password min length 8 → 12 + complexity**: shared `IsStrongPassword()` decorator (`common/validators/password-policy.decorator.ts`) applied to ConfirmPasswordResetDto, RegisterTenantDto, RegisterEmployeeDto.
2. ✅ DONE — **`iss`/`aud`/`nbf` claims**: signed in auth.module (JWT_ISSUER/JWT_AUDIENCE env, defaults pingforce/pingforce-api), validated in jwt.strategy.
3. ✅ DONE — **All failed-login branches audited**: UNKNOWN_ACCOUNT, bad password, ACCOUNT_INACTIVE.
4. ⏸ Phase 3 — **Refresh token → opaque random value** instead of signed JWT (RefreshToken.md §3).
5. ⏸ Phase 3 — **Persist super-admin refresh tokens** (needs schema change: RefreshToken.userId FK targets User, not SuperAdmin).
6. ✅ DONE — **Dedicated OTP endpoints**: `POST /auth/otp/request` + `POST /auth/otp/verify` (JWT-guarded, EMAIL_VERIFICATION purpose, rate-limited).
7. ✅ DONE — **Email dispatch → BullMQ queue**: `notifications` queue, 3 attempts with exponential backoff, NotificationLog lifecycle tracked in processor.

---

## 4. Phase 2b (deferred completions) proposed order

1. Password policy enforcement (items 1–3 above)
2. FCM push via DeviceToken (Push.md)
3. OCI Object Storage for files (Storage.md/Upload.md) + fix unauthenticated uploads
4. Login history model + self-service endpoint (LoginHistory.md)
5. Email queueing/retries + per-tenant provider config (Email.md)
6. OTP standalone endpoints + SMS channel stub (OTP.md)
