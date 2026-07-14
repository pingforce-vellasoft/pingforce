# API.md

# Fault Management Module – REST API Specification

**Platform:** Enterprise Multi-Tenant Workforce Management SaaS Platform  
**Module:** Fault Management  
**Version:** 1.0  
**Architecture:** REST + JSON (API-First)

---

# 1. Overview

This document defines the REST APIs for the Fault Management module. APIs are designed for Angular Web Portal, Flutter Mobile App, Customer Portal, Super Admin Portal, third-party integrations, and public APIs.

All APIs are tenant-aware, RBAC-protected, versioned, auditable, and integrate with the Workflow Engine, Assignment Engine, SLA Engine, Notification Engine, Analytics Engine, and Audit Framework.

Base URL

```
/api/v1/fault-management
```

Authentication

- JWT Bearer Token
- OAuth2 (optional)
- API Keys (integration)
- Refresh Tokens
- Tenant Resolution via Client Code/Header

Headers

```
Authorization: Bearer <token>
X-Tenant-Code: CLIENT001
Content-Type: application/json
Accept: application/json
```

---

# 2. Common Response Format

Success

```json
{
  "success": true,
  "message": "Request processed successfully",
  "data": {},
  "meta": {}
}
```

Error

```json
{
  "success": false,
  "errorCode": "FAULT_001",
  "message": "Validation failed",
  "errors": []
}
```

---

# 3. Fault APIs

## Create Fault

POST `/faults`

Purpose

- Create new fault

Permissions

- fault.create

Request

- title
- description
- customerId
- siteId
- categoryId
- priorityId
- attachments (optional)

Response

- Fault ID
- Fault Number
- Workflow State
- SLA Details

---

## Search Faults

GET `/faults`

Filters

- status
- priority
- assignee
- category
- customer
- region
- branch
- fromDate
- toDate
- keyword

Supports:

- Pagination
- Sorting
- Global Search

---

## Get Fault Details

GET `/faults/{faultId}`

Returns

- Master information
- Assignment
- Workflow
- SLA
- Attempts
- Attachments
- Feedback
- RCA
- Audit summary

---

## Update Fault

PUT `/faults/{faultId}`

Permission

- fault.update

---

## Delete Fault (Logical)

DELETE `/faults/{faultId}`

Permission

- fault.delete

---

# 4. Assignment APIs

POST `/faults/{faultId}/assign`

POST `/faults/{faultId}/reassign`

POST `/faults/bulk-assign`

GET `/faults/{faultId}/assignment-history`

Permissions

- fault.assign
- fault.reassign

---

# 5. Workflow APIs

POST `/faults/{faultId}/transition`

POST `/faults/{faultId}/accept`

POST `/faults/{faultId}/reject`

POST `/faults/{faultId}/resolve`

POST `/faults/{faultId}/close`

POST `/faults/{faultId}/reopen`

Workflow validation is executed before every transition.

---

# 6. Attempt APIs

POST `/faults/{faultId}/attempts`

PUT `/attempts/{attemptId}`

POST `/attempts/{attemptId}/submit`

GET `/faults/{faultId}/attempts`

POST `/attempts/{attemptId}/attachments`

---

# 7. Attachment APIs

POST `/attachments`

GET `/attachments/{id}`

DELETE `/attachments/{id}`

Supported

- Image
- PDF
- Video
- Documents

---

# 8. SLA APIs

GET `/faults/{faultId}/sla`

POST `/sla/policies`

PUT `/sla/policies/{id}`

GET `/sla/breaches`

GET `/sla/dashboard`

---

# 9. Escalation APIs

POST `/faults/{faultId}/escalate`

GET `/faults/{faultId}/escalations`

POST `/escalation-rules`

PUT `/escalation-rules/{id}`

---

# 10. Customer Feedback APIs

POST `/faults/{faultId}/feedback-request`

POST `/faults/{faultId}/feedback`

GET `/faults/{faultId}/feedback`

GET `/feedback/reports`

---

# 11. Root Cause Analysis APIs

POST `/faults/{faultId}/rca`

PUT `/rca/{id}`

POST `/rca/{id}/approve`

POST `/rca/{id}/close`

GET `/rca/{id}`

GET `/rca/reports`

---

# 12. Comments APIs

POST `/faults/{faultId}/comments`

GET `/faults/{faultId}/comments`

DELETE `/comments/{id}`

Supports:

- Internal comments
- Customer-visible comments
- Mentions

---

# 13. Reporting APIs

GET `/reports/open-faults`

GET `/reports/sla`

GET `/reports/technician-productivity`

GET `/reports/repeat-faults`

GET `/reports/customer-feedback`

Export

- Excel
- CSV
- PDF

---

# 14. Notification APIs

POST `/notifications/test`

GET `/notifications/history`

POST `/notifications/resend`

---

# 15. Analytics APIs

GET `/analytics/dashboard`

GET `/analytics/kpis`

GET `/analytics/trends`

KPIs include:

- MTTR
- First-Time Fix
- SLA Compliance
- Reopen Rate
- Technician Productivity

---

# 16. Mobile Sync APIs

POST `/mobile/sync`

GET `/mobile/pending`

POST `/mobile/conflicts/resolve`

Supports offline synchronization.

---

# 17. Webhook APIs

Outbound Events

- fault.created
- fault.assigned
- fault.resolved
- fault.closed
- sla.breached
- feedback.received

Inbound Webhooks

POST `/webhooks/faults`

POST `/webhooks/status`

---

# 18. RBAC

Permissions enforced on every endpoint.

Examples

- fault.view
- fault.create
- fault.update
- fault.assign
- fault.resolve
- fault.close
- fault.export
- rca.approve

---

# 19. Error Codes

Examples

- FAULT_001 Validation Error
- FAULT_002 Not Found
- FAULT_003 Permission Denied
- FAULT_004 Invalid Workflow Transition
- SLA_001 SLA Breached
- ATTEMPT_001 Invalid Attempt
- RCA_001 Approval Required

---

# 20. Versioning

Current Version

```
v1
```

Future versions

- v2
- v3

Backward compatibility maintained whenever possible.

---

# 21. Security

- JWT Authentication
- HTTPS only
- Row-Level Security
- Tenant Isolation
- Audit Logging
- Rate Limiting
- Input Validation
- File Scanning
- CSRF protection (web)
- Secure Headers

---

# 22. Future APIs

- AI Recommendations
- AI Fault Classification
- IoT Device Integration
- Voice Notes
- OCR Processing
- Knowledge Base Suggestions
- Predictive Maintenance

---

# Conclusion

The API layer exposes secure, versioned, scalable REST endpoints for complete Fault Management operations. It is designed around enterprise multi-tenancy, RBAC, workflow orchestration, SLA enforcement, offline synchronization, analytics, and white-label deployments, making it suitable for large-scale Workforce Management SaaS implementations.
