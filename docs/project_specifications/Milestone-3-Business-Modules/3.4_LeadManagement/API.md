# Lead Management Module

# API.md

## Document Information

  Item       Value
  ---------- --------------------------------------
  Module     Lead Management
  Document   REST API Specification
  Platform   Enterprise Workforce Management SaaS
  Version    1.0
  Status     Production Ready

------------------------------------------------------------------------

# 1. Overview

This document defines the REST APIs for the Lead Management module. APIs
are versioned, tenant-aware, RBAC-protected, auditable, and designed for
Web, Mobile, Partner Integrations, and third-party systems.

Base URL: `/api/v1`

Authentication: - JWT Access Token - Refresh Token - API Keys
(Integrations) - OAuth2 (Future)

Headers: - Authorization: Bearer `<token>`{=html} - X-Tenant-Code -
X-Client-Version - X-Request-Id

------------------------------------------------------------------------

# 2. Lead APIs

## Create Lead

POST /leads

Request: - Lead details - Source - Campaign - Owner - Custom fields

Response: - Lead ID - Lead Number - Status

## Search Leads

GET /leads

Supports: - Pagination - Sorting - Global Search - Filters - Date ranges

## Lead Details

GET /leads/{leadId}

## Update Lead

PUT /leads/{leadId}

## Delete (Soft)

DELETE /leads/{leadId}

------------------------------------------------------------------------

# 3. Assignment APIs

POST /leads/{leadId}/assign

POST /leads/{leadId}/reassign

GET /leads/{leadId}/assignment-history

GET /leads/unassigned

------------------------------------------------------------------------

# 4. Pipeline APIs

GET /pipeline

POST /pipeline/stages

PUT /pipeline/stages/{stageId}

POST /leads/{leadId}/move-stage

GET /pipeline/dashboard

------------------------------------------------------------------------

# 5. Follow-up APIs

POST /followups

GET /followups

GET /followups/{id}

PUT /followups/{id}

POST /followups/{id}/complete

POST /followups/{id}/escalate

GET /followups/calendar

------------------------------------------------------------------------

# 6. Quotation APIs

POST /quotations

GET /quotations

GET /quotations/{id}

PUT /quotations/{id}

POST /quotations/{id}/approve

POST /quotations/{id}/send

POST /quotations/{id}/convert

------------------------------------------------------------------------

# 7. Customer Conversion APIs

POST /leads/{leadId}/convert

GET /conversions

GET /conversions/{id}

POST /conversions/{id}/approve

------------------------------------------------------------------------

# 8. Duplicate Management APIs

POST /duplicates/check

GET /duplicates

POST /duplicates/merge

POST /duplicates/review

GET /duplicates/history

------------------------------------------------------------------------

# 9. Import & Export APIs

POST /import/leads

GET /imports/{jobId}

GET /exports

POST /exports

Supported: - Excel - CSV - PDF

------------------------------------------------------------------------

# 10. Activity APIs

POST /activities

GET /activities

PUT /activities/{id}

DELETE /activities/{id}

POST /activities/upload

------------------------------------------------------------------------

# 11. Document APIs

POST /documents

GET /documents/{id}

DELETE /documents/{id}

------------------------------------------------------------------------

# 12. Notification APIs

GET /notifications

PUT /notifications/{id}/read

POST /notifications/test

------------------------------------------------------------------------

# 13. Dashboard APIs

GET /dashboard/executive

GET /dashboard/manager

GET /dashboard/employer

GET /dashboard/admin

------------------------------------------------------------------------

# 14. Reports APIs

GET /reports/funnel

GET /reports/conversion

GET /reports/followups

GET /reports/quotations

GET /reports/performance

GET /reports/custom

------------------------------------------------------------------------

# 15. Common Response Format

Success: - success - message - data - metadata

Error: - success - errorCode - message - validationErrors - traceId

------------------------------------------------------------------------

# 16. Security

-   JWT Authentication
-   RBAC Authorization
-   Row-Level Security
-   Tenant Isolation
-   API Rate Limiting
-   Request Validation
-   Input Sanitization
-   Audit Logging

------------------------------------------------------------------------

# 17. API Standards

-   RESTful conventions
-   UUID identifiers
-   ISO-8601 timestamps
-   Cursor/Page pagination
-   Idempotent PUT
-   Soft deletes
-   Consistent HTTP status codes

------------------------------------------------------------------------

# 18. Webhooks

Outgoing: - Lead Created - Lead Assigned - Lead Converted - Quotation
Approved - Follow-up Completed

Incoming: - Website Forms - CRM - Marketing Platforms - Third-party
Integrations

------------------------------------------------------------------------

# 19. Performance

-   \<2 second average response
-   Async bulk processing
-   Queue-based imports
-   Horizontal scalability
-   API versioning support

------------------------------------------------------------------------

# 20. Acceptance Criteria

-   APIs documented
-   OpenAPI compatible
-   Tenant aware
-   RBAC enforced
-   Fully auditable
-   Production ready
