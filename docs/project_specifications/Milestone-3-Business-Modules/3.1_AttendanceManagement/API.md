# API.md

# Attendance Module API Specification

**Module:** Attendance
**Platform:** Enterprise Workforce Management SaaS Platform
**Architecture:** REST API (Versioned)
**Version:** v1
**Authentication:** JWT + Refresh Token + RBAC + Tenant Resolution
**Status:** Production Ready

---

# 1. Overview

The Attendance API provides secure, multi-tenant REST endpoints for attendance operations including check-in, check-out, shift validation, GPS validation, attendance corrections, offline synchronization, reporting, and administration.

Base URL

/api/v1/attendance

All APIs require:

- JWT Authentication
- Tenant Resolution
- Role-Based Authorization
- Audit Logging
- Rate Limiting
- Request Validation

---

# 2. Standard Headers

Authorization: Bearer <JWT>

X-Tenant-Code: TENANT001

X-Client-Version: 1.0.0

X-Platform: Android | Web

X-Device-Id: device_uuid

---

# 3. Authentication Flow

Login
→ JWT
→ Refresh Token
→ API Access
→ Token Validation
→ RBAC
→ Tenant Resolution

---

# 4. Attendance APIs

## POST /check-in

Purpose

Create attendance session.

Request

- employeeId
- attendanceMethod
- latitude
- longitude
- accuracy
- deviceId
- biometricVerified
- remarks

Response

- attendanceId
- sessionId
- status
- serverTime

Possible Errors

401 Unauthorized

403 Permission Denied

409 Active Session Exists

422 GPS Validation Failed

---

## POST /check-out

Request

- attendanceId
- latitude
- longitude
- remarks

Response

- workMinutes
- overtimeMinutes
- attendanceStatus

---

## GET /history

Supports

- Date filters
- Pagination
- Search

Returns

Attendance history.

---

## GET /summary

Returns

- Present
- Absent
- Late
- Leave
- Overtime

---

# 5. Shift APIs

GET /shifts

GET /shifts/today

GET /shift-assignment

POST /shift-assignment

PUT /shift-assignment/{id}

DELETE /shift-assignment/{id}

---

# 6. Attendance Correction APIs

POST /corrections

GET /corrections

GET /corrections/{id}

PUT /corrections/{id}

POST /corrections/{id}/approve

POST /corrections/{id}/reject

---

# 7. GPS APIs

POST /gps/validate

POST /gps/location

GET /gps/history

GET /gps/geofences

POST /gps/geofences

PUT /gps/geofences/{id}

DELETE /gps/geofences/{id}

---

# 8. Offline Sync APIs

POST /offline/sync

POST /offline/retry

GET /offline/status

GET /offline/conflicts

POST /offline/resolve

---

# 9. Reports APIs

GET /reports/daily

GET /reports/monthly

GET /reports/overtime

GET /reports/late

GET /reports/gps

GET /reports/export

Export Formats

- Excel
- CSV
- PDF

---

# 10. Admin APIs

GET /policies

PUT /policies

GET /settings

PUT /settings

GET /holidays

POST /holidays

GET /audit

---

# 11. Response Format

Success

{
"success": true,
"message": "Operation completed",
"data": {}
}

Failure

{
"success": false,
"errorCode": "GPS_VALIDATION_FAILED",
"message": "Attendance rejected."
}

---

# 12. HTTP Status Codes

200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# 13. RBAC

Employee

- Check-In
- Check-Out
- History

Manager

- Team Attendance
- Approvals

Employer

- Policies
- Reports

Super Admin

- Global Monitoring
- Tenant Configuration

---

# 14. Security

- JWT Authentication
- Refresh Tokens
- Tenant Isolation
- RBAC
- API Rate Limiting
- Request Validation
- Input Sanitization
- Audit Logging
- TLS Required

---

# 15. Integrations

- Authentication
- RBAC
- User Module
- Shift Management
- GPS Validation
- Workflow Engine
- Notification Engine
- Leave Management
- Payroll
- Reporting
- Analytics
- Audit Framework

---

# 16. API Versioning

Current

v1

Future

v2

Breaking changes will use URI versioning.

---

# 17. Future APIs

- Face Recognition
- BLE Validation
- Wearable Sync
- AI Attendance Scoring
- Predictive Attendance
- Payroll Settlement

---

End of API Specification
