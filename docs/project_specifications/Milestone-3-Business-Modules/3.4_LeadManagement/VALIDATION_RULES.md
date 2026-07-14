# Lead Management Module

# VALIDATION_RULES.md

## Document Information

Item Value

---

Module Lead Management
Document Validation Rules Specification
Platform Enterprise Workforce Management SaaS
Version 1.0
Status Production Ready

---

# 1. Purpose

This document defines all validation rules enforced across the Lead
Management module to ensure data quality, business compliance, workflow
consistency, security, and tenant isolation. Validations are applied
consistently across Web Portal, Admin Portal, Mobile App, REST APIs,
Bulk Imports, Webhooks, and third-party integrations.

---

# 2. Validation Principles

- Server-side validation is mandatory.
- Client-side validation improves user experience but never replaces
  server validation.
- Rules are tenant configurable where applicable.
- All validation failures return standardized error codes.
- Every validation failure is auditable when required.

---

# 3. Validation Layers

1.  UI Validation
2.  API Request Validation
3.  Business Rule Validation
4.  Workflow Validation
5.  RBAC Validation
6.  Tenant Isolation Validation
7.  Database Constraint Validation
8.  Integration Validation

---

# 4. Common Validation Rules

## Required Fields

- First Name
- Mobile Number (or configured primary contact)
- Lead Source
- Owner (if auto-assignment disabled)
- Pipeline Stage
- Tenant ID

## Data Types

- UUID for identifiers
- ISO-8601 dates
- Decimal for currency
- Boolean flags
- JSON for configurable metadata

## Length Constraints

- Name: 2--200 characters
- Company: 2--255 characters
- Notes: configurable (default 5000 chars)
- Tags: configurable maximum

---

# 5. Contact Validation

## Mobile

- Country code validation
- Numeric only
- Length per country
- Duplicate check (tenant configurable)

## Email

- RFC-compliant format
- Domain validation (optional)
- Duplicate detection
- Disposable email blocking (optional)

---

# 6. Address Validation

Validate: - Country - State - Postal Code - GPS Coordinates - Mandatory
address fields by tenant configuration

---

# 7. Lead Validation

- Lead number uniqueness per tenant
- Status transition validity
- Mandatory custom fields
- Duplicate policy enforcement
- Qualification score range
- Expected value \>= 0

---

# 8. Assignment Validation

Before assignment: - User active - Correct tenant - Correct
branch/territory - Required role exists - Capacity not exceeded -
Leave/holiday validation - SLA eligibility

---

# 9. Pipeline Validation

- Allowed stage transitions
- Required documents uploaded
- Mandatory activities completed
- Required approvals complete
- Mandatory fields completed

---

# 10. Follow-up Validation

- Future schedule (unless logging completed activity)
- Valid outcome
- Assigned owner exists
- Reminder offset valid
- Completion requires outcome and notes (configurable)

---

# 11. Quotation Validation

- Valid quotation number
- Product exists
- Quantity \> 0
- Price \>= 0
- Discount within threshold
- Tax rules valid
- Approval required if threshold exceeded
- Valid until date \>= quotation date

---

# 12. Customer Conversion Validation

- Qualified stage reached
- Mandatory documents present
- Duplicate customer check
- Approval complete
- Required contact details available

---

# 13. File Validation

- Allowed MIME type
- Maximum file size
- Virus scan pass
- Filename sanitization
- Storage availability

---

# 14. Import Validation

- Template version
- Mandatory columns
- Row-level validation
- Duplicate detection
- Partial success support
- Error report generation

---

# 15. API Validation

- JWT authentication
- Tenant header
- Idempotency (where applicable)
- Rate limits
- Payload schema
- Unsupported fields rejected

---

# 16. Security Validation

- RBAC permission check
- Row-level access
- CSRF (web)
- Input sanitization
- XSS protection
- SQL injection prevention
- File upload validation

---

# 17. Error Handling

Standard response: - Error Code - Error Message - Field Name -
Validation Type - Trace ID - Timestamp

Example codes: - LMV-001 Required Field Missing - LMV-002 Duplicate
Lead - LMV-003 Invalid Pipeline Transition - LMV-004 Unauthorized
Assignment - LMV-005 Invalid Quotation - LMV-006 Conversion Not Allowed

---

# 18. Recommended Database Constraints

- Unique (tenant_id, lead_number)
- Unique (tenant_id, quotation_number)
- Foreign keys
- CHECK constraints
- NOT NULL constraints
- Optimized indexes

---

# 19. Audit Requirements

Log: - Validation overrides - Duplicate overrides - Approval bypass
attempts - Security validation failures - Import failures

---

# 20. Performance

- Validation \<100ms for standard requests
- Bulk validation asynchronous
- Cached master data lookups
- Horizontal scalability

---

# 21. Future Enhancements

- AI anomaly detection
- AI data quality scoring
- Predictive validation
- Auto-correction suggestions
- Intelligent duplicate prevention

---

# 22. Acceptance Criteria

- Consistent validation across all channels
- Tenant-specific rules supported
- RBAC enforced
- Workflow validations operational
- Secure error handling
- Audit logging available
- Production ready
