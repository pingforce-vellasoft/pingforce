# FieldPermissions.md

# Enterprise Workforce Platform

## Core Platform – RBAC Module

### Field-Level Permission & Data Access Specification

**Module:** Core Platform → RBAC  
**Document:** Field Permissions  
**Version:** 1.0.0  
**Status:** Approved for Detailed Design  
**Owner:** Platform Architecture Team

---

# 1. Purpose

Field Permissions define authorization at the individual data field level. While RBAC determines whether a user can access a screen or perform an action, Field Permissions determine **which fields are visible, editable, mandatory, masked, or read-only**.

This capability protects sensitive information while allowing users to work efficiently with the data they are permitted to access.

Field-level authorization complements, but never replaces:

- Authentication
- JWT
- RBAC
- Menu Permissions
- Screen Permissions
- API Authorization
- Database Security
- Multi-Tenant Isolation

---

# 2. Objectives

The subsystem shall:

- Protect sensitive business data.
- Support field visibility rules.
- Support read-only fields.
- Support conditional editing.
- Support data masking.
- Support tenant-specific configuration.
- Support future attribute-based access control (ABAC).
- Maintain complete audit history.

---

# 3. Authorization Hierarchy

Authentication
→ Tenant Validation
→ Screen Permission
→ API Permission
→ Resource Permission
→ Field Permission
→ Business Rule Validation

Default outcome: **DENY**

---

# 4. Field Permission Types

Each field may have one or more permissions:

- Hidden
- Visible
- Read Only
- Editable
- Mandatory
- Optional
- Masked
- Calculated
- System Managed

Example:

Employee Salary

Platform Admin → Editable

HR Manager → Editable

Manager → Masked

Employee → Hidden

---

# 5. Field Metadata

Each protected field defines:

- field_id
- field_code
- entity
- database_column
- display_name
- data_type
- sensitivity
- required_permission
- masking_policy
- editable
- mandatory
- audit_enabled
- tenant_scope
- status

Field codes are immutable.

---

# 6. Data Classification

## Public

Examples:

- Employee Name
- Department
- Designation

## Internal

- Attendance Status
- Assigned Manager
- Shift

## Confidential

- Salary
- Bank Details
- Tax Information
- National Identification Numbers

## Restricted

- Password Hash
- Refresh Token Hash
- Security Keys
- Audit Integrity Values

Restricted fields are never exposed through application APIs.

---

# 7. Visibility Rules

A field is displayed only if:

✓ User authenticated

✓ Tenant active

✓ Screen authorized

✓ API authorized

✓ Field permission granted

✓ Business rule satisfied

Otherwise the field is hidden or masked.

---

# 8. Edit Rules

Editable only when:

- Screen allows editing
- User has UPDATE permission
- Field editable flag is true
- Business workflow permits modification
- Record not locked

System-managed fields remain read-only.

---

# 9. Masking Policies

Supported strategies:

- Full Mask
- Partial Mask
- Last 4 Visible
- First 4 Visible
- Email Mask
- Mobile Mask
- Custom Pattern

Example:

9876543210

↓

98**\*\***10

Masking never modifies stored data.

---

# 10. Conditional Field Rules

Examples:

Employee

- Salary hidden
- Personal email editable
- Department read-only

Manager

- Team salary masked
- Attendance editable
- Performance review editable

Tenant Administrator

- Full visibility except platform secrets.

---

# 11. Entity Examples

## User

Protected fields:

- Salary
- PAN
- Aadhaar / National ID
- Bank Account
- Personal Email
- Mobile Number

## Attendance

Protected fields:

- Manual override reason
- Approval remarks
- GPS coordinates (tenant policy)

## Fault Ticket

Protected fields:

- Internal notes
- Escalation history
- SLA overrides

## Lead

Protected fields:

- Expected revenue
- Commission
- Probability score

---

# 12. API Behaviour

Server responses:

Authorized field
→ Returned

Masked field
→ Masked value

Hidden field
→ Omitted

Read-only field
→ Returned but update rejected

All validation occurs server-side.

---

# 13. Database Strategy

Field permissions are configuration metadata.

Suggested tables:

field_permissions

field_permission_rules

role_field_permissions

field_masks

field_audit

Indexes:

- tenant_id
- entity
- field_code
- role_id

---

# 14. Security Controls

Mandatory:

- Server-side filtering
- API serialization rules
- Input validation
- Output masking
- Tenant isolation
- Audit logging
- Optimistic locking
- No client-side trust

---

# 15. Audit Events

- Field Viewed
- Sensitive Field Viewed
- Field Updated
- Field Mask Applied
- Permission Changed
- Unauthorized Field Access

Audit includes:

- tenant_id
- user_id
- entity
- field_code
- action
- timestamp
- correlation_id

---

# 16. Error Codes

FIELD-001 Permission Denied

FIELD-002 Field Hidden

FIELD-003 Read Only

FIELD-004 Invalid Field

FIELD-005 Masking Policy Missing

FIELD-006 Tenant Mismatch

---

# 17. Performance Targets

Field authorization: <10 ms

Mask generation: <5 ms

Serialization filtering: <20 ms

---

# 18. Testing Strategy

Functional

- Hidden fields
- Read-only fields
- Editable fields
- Mandatory validation

Security

- Direct API manipulation
- Hidden field injection
- Privilege escalation
- Cross-tenant access

Performance

- Large entities
- Bulk serialization
- High concurrent requests

---

# 19. Future Enhancements

- ABAC (Attribute-Based Access Control)
- Department-scoped visibility
- Geographic restrictions
- Time-based permissions
- Dynamic policy engine
- Data Loss Prevention integration

---

# 20. Acceptance Criteria

- Sensitive fields protected.
- Masking policies enforced.
- Read-only rules enforced.
- Hidden fields excluded from responses.
- Tenant isolation maintained.
- Audit events generated.
- Automated tests passing.

---

# 21. Dependencies

- RBAC.md
- Roles.md
- Permissions.md
- PermissionMatrix.md
- ScreenPermissions.md
- Authentication.md
- Multi-Tenant
- User Management

---

# 22. Related Documents

- BUSINESS_RULES.md
- TECH_STACK.md
- CODING_STANDARDS.md
- DEFINITION_OF_DONE.md
- ADR-001_MULTI_TENANCY.md
- ADR-002_TECH_STACK.md

This document is the authoritative Field-Level Permission specification for the Enterprise Workforce Platform RBAC module.
