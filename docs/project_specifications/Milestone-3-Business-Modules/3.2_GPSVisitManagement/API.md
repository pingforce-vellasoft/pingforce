# API.md

# GPS Visit Management - API Specification

**Module:** GPS Visit Management
**Component:** REST API
**Platform:** Enterprise Workforce Management SaaS Platform
**Version:** 1.0.0
**Status:** Production Ready

---

# 1. Purpose

Defines REST APIs for planning, assigning, executing, monitoring, validating and reporting GPS-based field visits. All APIs are tenant-aware, JWT protected, RBAC-enabled, auditable and versioned.

---

# 2. Standards

- RESTful APIs
- JSON
- HTTPS
- JWT Authentication
- OpenAPI 3.1
- ISO-8601 UTC timestamps
- UUID identifiers
- Cursor/Page pagination

Base URL

/api/v1

---

# 3. Authentication

POST /auth/login
POST /auth/refresh
POST /auth/logout

Headers

Authorization: Bearer <JWT>
X-Tenant-Id: <tenant>

---

# 4. Visit APIs

POST   /visits
GET    /visits
GET    /visits/{visitId}
PUT    /visits/{visitId}
DELETE /visits/{visitId}

POST   /visits/{visitId}/assign
POST   /visits/{visitId}/accept
POST   /visits/{visitId}/reject
POST   /visits/{visitId}/start
POST   /visits/{visitId}/pause
POST   /visits/{visitId}/resume
POST   /visits/{visitId}/complete
POST   /visits/{visitId}/cancel
POST   /visits/{visitId}/reopen

---

# 5. Route APIs

POST /routes
GET  /routes
GET  /routes/{routeId}
PUT  /routes/{routeId}
DELETE /routes/{routeId}

POST /routes/{routeId}/optimize
POST /routes/{routeId}/assign
GET  /routes/{routeId}/playback

---

# 6. GPS APIs

POST /gps/location
GET  /gps/live
GET  /gps/history
GET  /gps/playback
POST /gps/validate

---

# 7. Geofence APIs

POST /geofences
GET  /geofences
GET  /geofences/{id}
PUT  /geofences/{id}
DELETE /geofences/{id}
POST /geofences/validate

---

# 8. Location History APIs

GET /locations/history
GET /locations/employee/{employeeId}
GET /locations/visit/{visitId}
GET /locations/route/{routeId}

---

# 9. Evidence APIs

POST /visits/{visitId}/evidence
GET  /visits/{visitId}/evidence
DELETE /evidence/{evidenceId}

Supported:
- Images
- Documents
- Signature
- Audio
- Video

---

# 10. Offline Sync APIs

POST /sync/start
POST /sync/manual
GET  /sync/status
GET  /sync/history
POST /sync/retry
POST /sync/resolve

---

# 11. Productivity APIs

GET /productivity
GET /productivity/dashboard
GET /productivity/employee/{employeeId}
GET /productivity/team/{teamId}

---

# 12. Dashboard APIs

GET /dashboards/employee
GET /dashboards/manager
GET /dashboards/employer
GET /dashboards/admin

---

# 13. Report APIs

GET /reports/daily
GET /reports/monthly
GET /reports/productivity
GET /reports/gps
GET /reports/route
GET /reports/export

---

# 14. Notification APIs

GET /notifications
PUT /notifications/{id}/read
GET /notifications/preferences
PUT /notifications/preferences

---

# 15. Common Response

Success

{
  "success": true,
  "message": "Operation completed",
  "data": {}
}

Error

{
  "success": false,
  "code": "VALIDATION_FAILED",
  "message": "Validation failed"
}

---

# 16. Status Codes

200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Failed
429 Too Many Requests
500 Internal Server Error

---

# 17. Validation

- JWT required
- Tenant required
- RBAC enforced
- UUID validation
- Request schema validation
- Business rule validation
- GPS validation
- Geofence validation

---

# 18. Security

- JWT
- RBAC
- HTTPS
- Rate limiting
- Audit logging
- Idempotency
- Request correlation ID

---

# 19. Integrations

- Attendance
- Customer
- Asset
- Fault Management
- Workflow
- Notifications
- Reporting
- Analytics
- File Management

---

# 20. Future Enhancements

- GraphQL
- WebSockets
- Server-Sent Events
- Bulk APIs
- Event streaming
- Webhooks
- API versioning automation

---

End of API Specification
