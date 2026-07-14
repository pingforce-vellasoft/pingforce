# API_LAYER.md

# Angular Admin - API Layer

## Purpose

This document defines the API integration architecture for the Angular Admin Portal. It standardizes how frontend modules communicate with backend services while ensuring consistency, security, maintainability, and scalability.

---

# Objectives

- Centralized API communication
- Consistent request/response handling
- Secure authentication
- Tenant-aware requests
- Reusable API services
- Standard error handling
- Easy maintenance

---

# Architecture Overview

```text
Angular Component
        │
Feature Service
        │
API Service
        │
HTTP Interceptor
        │
REST API
        │
Backend Services
```

---

# API Principles

- REST-based communication
- JSON payloads
- Stateless requests
- Feature-based service organization
- Reusable API wrapper
- No direct HttpClient usage in components

---

# API Folder Structure

```text
services/
├── api/
│   ├── api.service.ts
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── attendance.service.ts
│   ├── gps.service.ts
│   ├── fault.service.ts
│   ├── lead.service.ts
│   ├── report.service.ts
│   ├── notification.service.ts
│   ├── settings.service.ts
│   └── upload.service.ts
```

---

# Service Responsibilities

## API Service
- Base HTTP methods
- Request configuration
- Common headers
- Query parameters

## Feature Services
Each module exposes only its business operations.

Examples:
- User Service
- Attendance Service
- GPS Service
- Fault Service
- Lead Service
- Report Service
- Settings Service

---

# HTTP Methods

| Method | Purpose |
|---------|---------|
| GET | Read data |
| POST | Create records |
| PUT | Update records |
| PATCH | Partial updates |
| DELETE | Remove records |

---

# Authentication

Every protected request includes:

- JWT Access Token
- Tenant Identifier
- Client Code (where applicable)

Authentication lifecycle:

1. Login
2. Receive Tokens
3. Store Securely
4. Attach Token
5. Refresh Token when required
6. Logout

---

# HTTP Interceptors

Recommended interceptors:

- Authentication
- Tenant
- Loading
- Error
- Logging

Responsibilities:

- Add Authorization header
- Add Tenant header
- Handle token refresh
- Show loaders
- Log requests (development)

---

# Request Flow

```text
Component
   │
Feature Service
   │
API Service
   │
Interceptors
   │
Backend API
   │
Response
   │
State Update
   │
UI Refresh
```

---

# Standard API Response

Typical response contains:

- Success Status
- Message
- Data
- Pagination (if applicable)
- Validation Errors

---

# Error Handling

Handle:

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Validation Error
- 500 Internal Server Error

Display user-friendly messages while logging technical details.

---

# File Upload

Support:

- Images
- Documents
- Excel/CSV
- PDF

Recommended features:

- Size validation
- Type validation
- Progress indicator
- Retry support

---

# Pagination & Filtering

Support server-side:

- Pagination
- Sorting
- Search
- Advanced Filters

Avoid loading large datasets into the browser.

---

# Security

- HTTPS only
- JWT authentication
- Refresh tokens
- Input validation
- Output sanitization
- No sensitive data in local storage
- Backend authorization required

---

# Tenant Awareness

Every request should respect:

- Tenant
- User
- Permissions
- Licensed Modules
- Feature Flags

Backend remains the source of truth.

---

# Performance

- Cache lookup data
- Debounce search requests
- Cancel duplicate requests
- Lazy-load feature data
- Minimize API calls

---

# Logging

Development:

- Request URL
- Method
- Duration
- Status

Production:

- Log only essential diagnostics.

---

# Best Practices

- Keep components free of HTTP logic.
- Use strongly typed models.
- Keep one service per business domain.
- Reuse common API methods.
- Centralize endpoint configuration.
- Handle errors consistently.

---

# Related Documents

- README.md
- ARCHITECTURE.md
- PROJECT_STRUCTURE.md
- STATE_MANAGEMENT.md
- ROUTING.md
- AUTHENTICATION.md
- API_SPEC.md

---

# Version

Version: 1.0

Status: Approved for Implementation
