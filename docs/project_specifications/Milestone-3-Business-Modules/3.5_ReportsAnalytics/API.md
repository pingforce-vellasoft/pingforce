# API.md

# Reports & Analytics - API Specification

## Document Information

Field Value

---

Module Reports & Analytics
Document REST API Specification
Platform Enterprise Multi-Tenant Workforce Management SaaS
Version 2.0
API Style REST
Authentication JWT + RBAC + Tenant Context
Status Production Ready

---

# 1. Purpose

This document defines the REST APIs for the Reports & Analytics module.
The APIs support dashboards, reports, KPIs, scheduled reports, exports,
custom reports, widgets, templates, execution history, and analytics
while enforcing tenant isolation, feature licensing, row-level security,
and RBAC.

---

# 2. API Design Principles

- RESTful resource design
- Stateless communication
- JSON request/response
- Versioned APIs (/api/v1)
- Tenant-aware routing
- RBAC authorization
- Idempotent operations where applicable
- Cursor/offset pagination
- Consistent error handling
- OpenAPI compatible

---

# 3. Security

Authentication: - JWT Access Token - Refresh Token

Headers: - Authorization: Bearer `<token>`{=html} - X-Tenant-Code -
X-Client-Timezone - X-Correlation-Id

Authorization: - Role - Permission - Data Scope - Feature Flag - Module
License

---

# 4. Dashboard APIs

GET /api/v1/dashboards GET /api/v1/dashboards/{dashboardId} POST
/api/v1/dashboards PUT /api/v1/dashboards/{dashboardId} DELETE
/api/v1/dashboards/{dashboardId} POST
/api/v1/dashboards/{dashboardId}/clone POST
/api/v1/dashboards/{dashboardId}/favorite

---

# 5. Widget APIs

GET /api/v1/widgets GET /api/v1/widgets/{widgetId} POST /api/v1/widgets
PUT /api/v1/widgets/{widgetId} DELETE /api/v1/widgets/{widgetId} POST
/api/v1/widgets/{widgetId}/refresh

---

# 6. Report APIs

GET /api/v1/reports GET /api/v1/reports/{reportId} POST /api/v1/reports
PUT /api/v1/reports/{reportId} DELETE /api/v1/reports/{reportId} POST
/api/v1/reports/{reportId}/execute POST
/api/v1/reports/{reportId}/preview GET /api/v1/reports/history

---

# 7. Custom Report APIs

GET /api/v1/custom-reports POST /api/v1/custom-reports PUT
/api/v1/custom-reports/{reportId} DELETE
/api/v1/custom-reports/{reportId} POST
/api/v1/custom-reports/{reportId}/share POST
/api/v1/custom-reports/{reportId}/publish

---

# 8. KPI APIs

GET /api/v1/kpis GET /api/v1/kpis/{kpiCode} GET /api/v1/kpis/snapshots
POST /api/v1/kpis/recalculate

---

# 9. Export APIs

POST /api/v1/exports GET /api/v1/exports/{exportId} GET
/api/v1/exports/history DELETE /api/v1/exports/{exportId}

---

# 10. Scheduled Report APIs

GET /api/v1/scheduled-reports POST /api/v1/scheduled-reports PUT
/api/v1/scheduled-reports/{scheduleId} DELETE
/api/v1/scheduled-reports/{scheduleId} POST
/api/v1/scheduled-reports/{scheduleId}/pause POST
/api/v1/scheduled-reports/{scheduleId}/resume POST
/api/v1/scheduled-reports/{scheduleId}/execute GET
/api/v1/scheduled-reports/{scheduleId}/history

---

# 11. Template APIs

GET /api/v1/report-templates POST /api/v1/report-templates PUT
/api/v1/report-templates/{templateId} DELETE
/api/v1/report-templates/{templateId} POST
/api/v1/report-templates/{templateId}/clone

---

# 12. Analytics APIs

GET /api/v1/analytics/summary GET /api/v1/analytics/trends GET
/api/v1/analytics/executive GET /api/v1/analytics/workforce GET
/api/v1/analytics/sales GET /api/v1/analytics/operations GET
/api/v1/analytics/security

---

# 13. Standard Query Parameters

Supports: - page - size - sort - search - tenantId - companyId -
branchId - departmentId - teamId - employeeId - fromDate - toDate -
timezone

---

# 14. Standard Response

Success: { "success": true, "data": {}, "message": "Success",
"correlationId": "uuid" }

Error: { "success": false, "errorCode": "REPORT_NOT_FOUND", "message":
"Requested report does not exist.", "correlationId": "uuid" }

---

# 15. HTTP Status Codes

- 200 OK
- 201 Created
- 202 Accepted
- 204 No Content
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 429 Too Many Requests
- 500 Internal Server Error

---

# 16. Rate Limiting

- User level
- Tenant level
- API key level
- Burst protection
- Export throttling

---

# 17. Audit Events

Every mutating API records: - User - Tenant - IP Address - Device -
Action - Before/After values - Timestamp

---

# 18. Integrations

Integrated with: - Authentication - RBAC Engine - Module Engine -
Workflow Engine - Notification Engine - Audit Engine - Attendance - GPS
Visit - Fault Management - Lead Management - User Management

---

# 19. Future Roadmap

- GraphQL Gateway
- WebSocket live dashboards
- OData support
- BI connectors
- AI analytics APIs
- Streaming analytics
- Event-driven subscriptions

---

## Technology Stack

Frontend: - Angular - Flutter

Backend: - NestJS - Prisma ORM

Infrastructure: - PostgreSQL - Redis - Background Job Engine - API
Gateway

---

## Status

**API Specification:** Approved

**Implementation Readiness:** Production Ready
