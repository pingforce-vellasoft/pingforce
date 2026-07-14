# AUTHENTICATION.md

# Angular Admin - Authentication Architecture

## Purpose

This document defines the authentication strategy for the Angular Admin Portal. It ensures secure access to the Enterprise Multi-Tenant Workforce Management SaaS Platform while supporting multiple user roles, tenant isolation, and enterprise security standards.

---

# Objectives

- Secure user authentication
- Multi-tenant login support
- JWT-based authentication
- Refresh token mechanism
- Client code validation
- Session management
- Device awareness
- Scalable authentication architecture

---

# Authentication Overview

The platform authenticates users using a combination of:

- Client Code (All users except Super Admin)
- Username / Email / Employee ID
- Password
- JWT Access Token
- Refresh Token

This approach ensures tenant isolation and secure access.

---

# Supported User Types

| User Type         | Client Code Required |
| ----------------- | -------------------- |
| Super Admin       | No                   |
| Employer          | Yes                  |
| Manager           | Yes                  |
| Employee          | Yes                  |
| Customer (Future) | Yes                  |
| Vendor (Future)   | Yes                  |

---

# Authentication Flow

```text
User
   │
Enter Credentials
   │
Validate Client Code
   │
Authenticate User
   │
Generate JWT Access Token
   │
Generate Refresh Token
   │
Load User Profile
   │
Load Tenant Configuration
   │
Load Roles & Permissions
   │
Generate Dynamic Menu
   │
Redirect to Dashboard
```

---

# Login Process

## Super Admin

Required Fields

- Username / Email
- Password

## Tenant Users

Required Fields

- Client Code
- Username / Email / Employee ID
- Password

---

# Login Response

The backend should return:

- Access Token
- Refresh Token
- User Profile
- Tenant Information
- Assigned Roles
- Permissions
- Enabled Modules
- Feature Flags
- Session Expiry

---

# JWT Access Token

Purpose

- Authenticate API requests
- Identify logged-in user
- Validate session

Contains:

- User ID
- Tenant ID
- Role IDs
- Session ID
- Expiration Time

Do not store sensitive business data inside the token.

---

# Refresh Token

Responsibilities

- Renew expired access tokens
- Extend active sessions securely
- Avoid repeated logins

Refresh tokens should be securely stored and rotated according to backend policy.

---

# Token Storage

Recommended Approach

- Store access token securely in browser storage as per application security policy.
- Refresh token should use the most secure storage mechanism supported by the application architecture.
- Clear all authentication data during logout or session expiration.

---

# Session Management

Supports:

- Automatic timeout
- Token refresh
- Manual logout
- Force logout
- Session expiration handling

---

# Logout Process

1. Invalidate session.
2. Clear stored authentication data.
3. Redirect to Login page.
4. Navigate user away from protected routes.

---

# Route Protection

All protected routes require:

- Valid Access Token
- Active Session
- Valid Tenant
- Required Permissions

Unauthorized users should be redirected to the appropriate access-denied page.

---

# Password Policy

Recommended Rules

- Minimum length
- Uppercase letter
- Lowercase letter
- Number
- Special character

Backend should enforce password validation.

---

# Forgot Password

Flow

1. User requests password reset.
2. Identity verification.
3. Secure reset link or OTP.
4. Password update.
5. Confirmation.
6. Login with new password.

---

# Multi-Tenant Authentication

Authentication validates:

- Client Code
- Tenant Status
- Subscription Status
- User Status
- Enabled Modules

No cross-tenant access is permitted.

---

# Device & Login Tracking

Capture:

- Login Time
- Device Type
- Browser
- Operating System
- IP Address (Backend)
- Login Status

Supports security auditing and troubleshooting.

---

# HTTP Interceptor Responsibilities

- Attach Access Token
- Attach Tenant Identifier
- Detect 401 responses
- Refresh expired token
- Retry original request
- Redirect to Login when refresh fails

---

# Security Considerations

- HTTPS only
- JWT authentication
- Refresh token support
- Secure password handling
- Backend authorization checks
- Session timeout
- Login audit logging
- Prevent direct access to protected APIs

---

# Authentication Best Practices

- Never expose tokens in URLs.
- Do not hardcode credentials.
- Keep authentication logic centralized.
- Validate permissions on both frontend and backend.
- Clear authentication state on logout.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- ROUTING.md
- API_LAYER.md
- STATE_MANAGEMENT.md
- RBAC.md
- PERMISSION_MATRIX.md

---

# Version

Version: 1.0

Status: Approved for Implementation
