# API.md

# Business Notifications Module

## Enterprise Multi-Tenant Workforce Management SaaS Platform

**Version:** 2.0 Enterprise\
**Document:** REST API Specification\
**Status:** Production Ready

------------------------------------------------------------------------

# 1. Overview

This document defines the REST API contract for the Business
Notifications module. All APIs are tenant-aware, RBAC protected,
versioned, auditable, and designed for integration with the enterprise
Notification Engine.

**Base URL**

    /api/v1/notifications

Authentication: - JWT Bearer Token - OAuth2 (optional) - API Keys
(system integrations)

------------------------------------------------------------------------

# 2. Common Standards

Headers:

-   Authorization: Bearer {JWT}
-   X-Tenant-Id
-   X-Correlation-Id
-   Accept-Language
-   X-Timezone

Standard Response

``` json
{
  "success": true,
  "message": "Operation completed.",
  "data": {},
  "errors": [],
  "traceId": "uuid"
}
```

------------------------------------------------------------------------

# 3. Notification APIs

## Create Notification

POST `/notifications`

Request: - templateCode - recipients - channels - priority - variables -
scheduleAt

Response: - notificationId - queueStatus

------------------------------------------------------------------------

## Get Notification

GET `/notifications/{id}`

Returns complete notification details including delivery history.

------------------------------------------------------------------------

## Search Notifications

GET `/notifications`

Supports filters: - module - status - priority - channel - user - date
range - tenant

------------------------------------------------------------------------

## Cancel Notification

POST `/notifications/{id}/cancel`

------------------------------------------------------------------------

## Retry Notification

POST `/notifications/{id}/retry`

------------------------------------------------------------------------

## Mark As Read

POST `/notifications/{id}/read`

------------------------------------------------------------------------

# 4. Template APIs

-   GET `/templates`
-   GET `/templates/{id}`
-   POST `/templates`
-   PUT `/templates/{id}`
-   DELETE `/templates/{id}`
-   POST `/templates/{id}/publish`
-   POST `/templates/{id}/clone`
-   POST `/templates/{id}/preview`
-   POST `/templates/{id}/test`

------------------------------------------------------------------------

# 5. Broadcast APIs

-   GET `/broadcasts`
-   POST `/broadcasts`
-   GET `/broadcasts/{id}`
-   PUT `/broadcasts/{id}`
-   DELETE `/broadcasts/{id}`
-   POST `/broadcasts/{id}/submit`
-   POST `/broadcasts/{id}/approve`
-   POST `/broadcasts/{id}/publish`
-   POST `/broadcasts/{id}/cancel`
-   GET `/broadcasts/{id}/analytics`

------------------------------------------------------------------------

# 6. Announcement APIs

-   GET `/announcements`
-   POST `/announcements`
-   PUT `/announcements/{id}`
-   DELETE `/announcements/{id}`
-   POST `/announcements/{id}/publish`
-   POST `/announcements/{id}/acknowledge`
-   POST `/announcements/{id}/bookmark`

------------------------------------------------------------------------

# 7. Reminder APIs

-   GET `/reminders`
-   POST `/reminders`
-   PUT `/reminders/{id}`
-   DELETE `/reminders/{id}`
-   POST `/reminders/{id}/snooze`
-   POST `/reminders/{id}/complete`
-   POST `/reminders/{id}/retry`

------------------------------------------------------------------------

# 8. Escalation APIs

-   GET `/escalations`
-   POST `/escalations`
-   PUT `/escalations/{id}`
-   POST `/escalations/{id}/resolve`
-   POST `/escalations/{id}/override`
-   GET `/escalations/{id}/history`

------------------------------------------------------------------------

# 9. User Preference APIs

-   GET `/preferences`
-   PUT `/preferences`
-   POST `/preferences/reset`
-   GET `/preferences/defaults`
-   PUT `/preferences/defaults`

------------------------------------------------------------------------

# 10. Channel Management APIs

-   GET `/channels`
-   PUT `/channels/{id}`
-   POST `/channels/{id}/test`
-   GET `/providers`

------------------------------------------------------------------------

# 11. Analytics APIs

-   GET `/analytics/dashboard`
-   GET `/analytics/delivery`
-   GET `/analytics/templates`
-   GET `/analytics/channels`
-   GET `/analytics/export`

------------------------------------------------------------------------

# 12. Event APIs

-   GET `/events`
-   GET `/events/{id}`
-   POST `/events/replay`

------------------------------------------------------------------------

# 13. Webhooks

Inbound: - POST `/webhooks/provider`

Outbound: - Delivery Status - Read Receipt - Failure Event - Callback
Notification

------------------------------------------------------------------------

# 14. Security

-   JWT Authentication
-   RBAC Authorization
-   Row-Level Security
-   Tenant Isolation
-   API Rate Limiting
-   Idempotency Keys
-   Audit Logging

------------------------------------------------------------------------

# 15. Error Codes

-   400 Bad Request
-   401 Unauthorized
-   403 Forbidden
-   404 Not Found
-   409 Conflict
-   422 Validation Error
-   429 Too Many Requests
-   500 Internal Server Error

Business Codes: - TEMPLATE_NOT_FOUND - INVALID_CHANNEL -
INVALID_RECIPIENT - TENANT_DISABLED - PROVIDER_UNAVAILABLE -
RATE_LIMIT_EXCEEDED - DELIVERY_FAILED

------------------------------------------------------------------------

# 16. Performance Targets

-   API response \< 500 ms (excluding async delivery)
-   Queue processing asynchronous
-   Bulk APIs supported
-   Pagination mandatory
-   Cursor pagination for large datasets

------------------------------------------------------------------------

# 17. Versioning

Current Version: v1

Future: - Backward compatible evolution - Deprecation headers - OpenAPI
3.1 support - SDK generation

------------------------------------------------------------------------

# Version History

  Version   Description
  --------- ----------------------------------
  1.0       Initial API Specification
  2.0       Enterprise Multi-Tenant REST API
